#!/usr/bin/env python3
"""
High-Precision Vector-Accurate PBR Texture Baker for GT40 AR Export
Evaluates gt40-journey.js's exact 3D vertex/normal livery, Halibrand rim/spinner,
and 427 V8 powertrain color rules directly over each mesh's UV triangles using
2x2 sub-texel supersampling + edge gutter dilation so AR textures have razor-sharp
gloss black lacquer & white stripes with zero UV seam sawtooth artifacts.
"""

import json
import os
import struct
import numpy as np
from PIL import Image, ImageFilter

GLB_PATH = '/Users/perfectlyimperfect/Downloads/fordgt40-experience/assets/models/car/source/gt40.glb'
TEX_SRC = '/Users/perfectlyimperfect/Downloads/fordgt40-experience/assets/models/car/textures_web'
OUT_DIR = '/tmp/gt40_ar_baked'
os.makedirs(OUT_DIR, exist_ok=True)


def load_glb(path):
    with open(path, 'rb') as f:
        f.read(12)
        c0_len, _ = struct.unpack('<II', f.read(8))
        gltf = json.loads(f.read(c0_len).decode('utf-8'))
        c1_len, _ = struct.unpack('<II', f.read(8))
        bin_data = f.read(c1_len)
    return gltf, bin_data


def read_accessor(gltf, bin_data, idx):
    acc = gltf['accessors'][idx]
    bv = gltf['bufferViews'][acc['bufferView']]
    offset = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    stride = bv.get('byteStride', 0)
    ctype = acc['componentType']
    t = acc['type']
    cnt = acc['count']
    ncomp = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[t]
    dt_map = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
    dt = dt_map[ctype]
    item_sz = np.dtype(dt).itemsize * ncomp
    if stride and stride > item_sz:
        raw = np.frombuffer(bin_data, dtype=np.uint8, count=cnt * stride, offset=offset).reshape(cnt, stride)[:, :item_sz]
        arr = np.frombuffer(raw.tobytes(), dtype=dt).reshape(cnt, ncomp).astype(np.float64)
    else:
        arr = np.frombuffer(bin_data, dtype=dt, count=cnt * ncomp, offset=offset).reshape(cnt, ncomp).astype(np.float64)
    if acc.get('normalized'):
        if dt == np.int16:
            arr = np.maximum(arr / 32767.0, -1.0)
        elif dt == np.uint16:
            arr = arr / 65535.0
        elif dt == np.int8:
            arr = np.maximum(arr / 127.0, -1.0)
        elif dt == np.uint8:
            arr = arr / 255.0
    if t == 'SCALAR':
        return arr.ravel().astype(np.int64) if ctype in (5121, 5123, 5125) else arr.ravel()
    return arr


def rasterize_mesh_3d_to_uv(pos, norm, uv, indices, size, eval_fn, bg_rgb):
    """
    Rasterize every triangle onto its UV canvas using 2x2 subpixel supersampling
    and clean border gutter dilation.
    """
    ss = size * 2
    img = np.zeros((ss, ss, 3), dtype=np.uint8)
    mask = np.zeros((ss, ss), dtype=bool)
    img[:, :] = bg_rgb

    tris = indices.reshape(-1, 3)
    # UV y=0 at top for flipY=false glTF textures
    u_px = uv[:, 0] * (ss - 1)
    v_px = uv[:, 1] * (ss - 1)

    for tri in tris:
        i0, i1, i2 = tri[0], tri[1], tri[2]
        x0, y0 = u_px[i0], v_px[i0]
        x1, y1 = u_px[i1], v_px[i1]
        x2, y2 = u_px[i2], v_px[i2]

        denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(denom) < 1e-6:
            continue

        min_x = max(0, int(np.floor(min(x0, x1, x2))))
        max_x = min(ss - 1, int(np.ceil(max(x0, x1, x2))))
        min_y = max(0, int(np.floor(min(y0, y1, y2))))
        max_y = min(ss - 1, int(np.ceil(max(y0, y1, y2))))
        if max_x < min_x or max_y < min_y:
            continue

        gx = np.arange(min_x, max_x + 1, dtype=np.float64)[None, :] + 0.5
        gy = np.arange(min_y, max_y + 1, dtype=np.float64)[:, None] + 0.5

        w0 = ((y1 - y2) * (gx - x2) + (x2 - x1) * (gy - y2)) / denom
        w1 = ((y2 - y0) * (gx - x2) + (x0 - x2) * (gy - y2)) / denom
        w2 = 1.0 - w0 - w1

        inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        if not np.any(inside):
            continue

        ww0 = np.clip(w0[inside], 0.0, 1.0)
        ww1 = np.clip(w1[inside], 0.0, 1.0)
        ww2 = np.clip(w2[inside], 0.0, 1.0)
        s = ww0 + ww1 + ww2
        ww0 /= s
        ww1 /= s
        ww2 /= s

        px3 = ww0[:, None] * pos[i0] + ww1[:, None] * pos[i1] + ww2[:, None] * pos[i2]
        nx3 = ww0[:, None] * norm[i0] + ww1[:, None] * norm[i1] + ww2[:, None] * norm[i2]
        nlen = np.linalg.norm(nx3, axis=1, keepdims=True)
        nx3 = nx3 / np.maximum(nlen, 1e-6)

        colors = eval_fn(px3, nx3)
        ys, xs = np.nonzero(inside)
        img[min_y + ys, min_x + xs] = colors
        mask[min_y + ys, min_x + xs] = True

    # Downsample 2x2 SSAA smoothly to target size
    pil_ss = Image.fromarray(img, 'RGB')
    pil_down = pil_ss.resize((size, size), Image.Resampling.LANCZOS)
    mask_down = np.array(Image.fromarray((mask.astype(np.uint8) * 255), 'L').resize((size, size), Image.Resampling.BILINEAR)) > 16

    # Dilate painted islands 6px into untouched background to eliminate seam/mipmap halo
    arr = np.array(pil_down, dtype=np.uint8)
    filled = arr.copy()
    cur_mask = mask_down.copy()
    for _ in range(6):
        pad_img = np.pad(filled, ((1, 1), (1, 1), (0, 0)), mode='edge')
        pad_msk = np.pad(cur_mask, ((1, 1), (1, 1)), mode='constant', constant_values=False)
        need = ~cur_mask
        if not np.any(need):
            break
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            nb_valid = pad_msk[1 + dy:1 + dy + size, 1 + dx:1 + dx + size] & need
            if np.any(nb_valid):
                filled[nb_valid] = pad_img[1 + dy:1 + dy + size, 1 + dx:1 + dx + size][nb_valid]
                cur_mask[nb_valid] = True
                need = ~cur_mask

    return Image.fromarray(filled, 'RGB')


def eval_body_livery(p, n):
    """Exact glossy obsidian black lacquer & twin center/rocker white racing stripes from gt40-journey.js."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    nx, ny = n[:, 0], n[:, 1]
    ax = np.abs(x)

    is_ext_top = (y > 0.04) & (ny > 0.12) & ~((z > 1.85) & (ny < 0.35))
    is_center = is_ext_top & (((ax >= 0.014) & (ax <= 0.088)) | ((ax >= 0.098) & (ax <= 0.108)))
    is_rocker = (y >= 0.014) & (y <= 0.044) & (np.abs(nx) > 0.58) & (z > -0.74) & (z < 0.84)
    is_stripe = is_center | is_rocker

    out = np.empty((len(p), 3), dtype=np.uint8)
    out[:] = [6, 7, 10]  # Deep piano black lacquer (#06070a) matching website P/1046 finish
    out[is_stripe] = [245, 247, 252]  # Crisp Le Mans racing white stripes
    return out


def eval_rims(p, n):
    """Halibrand magnesium gold spokes/dish + silver-white center knockoff spinner."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    cz = np.where(z > 0.0, 1.23, -1.11)
    cy = np.where(z > 0.0, 0.02, -0.03)
    spinner_r = np.hypot(y - cy, z - cz)

    out = np.empty((len(p), 3), dtype=np.uint8)
    out[:] = [202, 158, 46]  # Halibrand vintage magnesium gold
    is_spinner = spinner_r < 0.056
    out[is_spinner] = [235, 238, 244]  # Brushed silver 3-eared spinner cap
    return out


def eval_engine(p, n):
    """427 FE V8 blue block, ceramic white Bundle of Snakes headers, aluminum covers & gold carbs."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    ax = np.abs(x)
    out = np.empty((len(p), 3), dtype=np.uint8)
    out[:] = [34, 38, 44]  # Dark gunmetal alloy base

    # Main intake/carbs
    m_carb = (z >= -0.75) & (z <= -0.15) & (y > 0.40) & (ax < 0.14)
    out[m_carb] = [212, 170, 62]
    # Finned valve covers
    m_vc = (z >= -0.75) & (z <= -0.15) & (y > 0.36) & (ax >= 0.14) & (ax <= 0.32)
    out[m_vc] = [216, 221, 228]
    # Ford blue block (restricted strictly below upper intake shrouds)
    m_blk = (z >= -0.75) & (z <= -0.15) & (y >= 0.08) & (y <= 0.38)
    out[m_blk] = [28, 44, 72]
    # Bundle of snakes ceramic white
    m_snk = (z < -0.75) & (z >= -1.45) & (y > 0.16) & (y < 0.48) & (ax < 0.15)
    out[m_snk] = [228, 231, 236]
    # Rear transaxle / megaphone tips (dark gunmetal around scoops, alloy behind)
    m_rear = (z < -0.75) & ~m_snk
    m_rear_hi = m_rear & (y > 0.44)
    m_rear_lo = m_rear & ~(y > 0.44)
    out[m_rear_hi] = [20, 22, 26]
    out[m_rear_lo] = [76, 80, 88]
    return out


def eval_interior(p, n):
    """Matte obsidian lower rocker sills (prevents light grey bleed-through) + dark race cockpit."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    ax = np.abs(x)
    out = np.empty((len(p), 3), dtype=np.uint8)
    out[:] = [24, 26, 30]  # Dark matte charcoal bucket seats & tub

    # Any exterior side tub / lower rocker skirt -> pure obsidian black matching Body
    m_outer = (ax > 0.56) | (y < 0.04)
    out[m_outer] = [7, 8, 11]
    # Instrument gauges bezel / shifter hardware
    m_dash = (z > 0.42) & (z < 0.85) & (y > 0.25) & (ax < 0.50)
    out[m_dash] = [44, 48, 56]
    return out


def main():
    print('Loading source gt40.glb...')
    gltf, bin_data = load_glb(GLB_PATH)

    # 1. Bake Body Livery at 1536x1536 (quantized crisp PNG < 180 KB)
    p_body = gltf['meshes'][1]['primitives'][0]
    body_img = rasterize_mesh_3d_to_uv(
        read_accessor(gltf, bin_data, p_body['attributes']['POSITION']),
        read_accessor(gltf, bin_data, p_body['attributes']['NORMAL']),
        read_accessor(gltf, bin_data, p_body['attributes']['TEXCOORD_0']),
        read_accessor(gltf, bin_data, p_body['indices']),
        1536, eval_body_livery, (6, 7, 10)
    )
    body_out = os.path.join(OUT_DIR, 'ar_body_basecolor.png')
    body_img.save(body_out, 'PNG', optimize=True)
    print(f'Saved {body_out} ({os.path.getsize(body_out)/1024:.1f} KB)')

    # 2. Bake Halibrand Rims (512x512)
    p_rim = gltf['meshes'][6]['primitives'][0]
    rim_img = rasterize_mesh_3d_to_uv(
        read_accessor(gltf, bin_data, p_rim['attributes']['POSITION']),
        read_accessor(gltf, bin_data, p_rim['attributes']['NORMAL']),
        read_accessor(gltf, bin_data, p_rim['attributes']['TEXCOORD_0']),
        read_accessor(gltf, bin_data, p_rim['indices']),
        512, eval_rims, (202, 158, 46)
    )
    rim_out = os.path.join(OUT_DIR, 'ar_rims_basecolor.png')
    rim_img.save(rim_out, 'PNG', optimize=True)
    print(f'Saved {rim_out} ({os.path.getsize(rim_out)/1024:.1f} KB)')

    # 3. Bake Engine Bay (512x512)
    p_eng = gltf['meshes'][2]['primitives'][0]
    eng_img = rasterize_mesh_3d_to_uv(
        read_accessor(gltf, bin_data, p_eng['attributes']['POSITION']),
        read_accessor(gltf, bin_data, p_eng['attributes']['NORMAL']),
        read_accessor(gltf, bin_data, p_eng['attributes']['TEXCOORD_0']),
        read_accessor(gltf, bin_data, p_eng['indices']),
        512, eval_engine, (34, 38, 44)
    )
    eng_out = os.path.join(OUT_DIR, 'ar_engine_basecolor.png')
    eng_img.save(eng_out, 'PNG', optimize=True)
    print(f'Saved {eng_out} ({os.path.getsize(eng_out)/1024:.1f} KB)')

    # 4. Bake Interior with obsidian outer rocker sills so tub never looks grey on side view
    p_int = gltf['meshes'][0]['primitives'][0]
    int_img = rasterize_mesh_3d_to_uv(
        read_accessor(gltf, bin_data, p_int['attributes']['POSITION']),
        read_accessor(gltf, bin_data, p_int['attributes']['NORMAL']),
        read_accessor(gltf, bin_data, p_int['attributes']['TEXCOORD_0']),
        read_accessor(gltf, bin_data, p_int['indices']),
        512, eval_interior, (7, 8, 11)
    )
    int_out = os.path.join(OUT_DIR, 'ar_interior_basecolor.png')
    int_img.save(int_out, 'PNG', optimize=True)
    print(f'Saved {int_out} ({os.path.getsize(int_out)/1024:.1f} KB)')

    # 5. Prepare compact high-quality supporting AR textures (PNG 512px)
    tires_src = os.path.join(TEX_SRC, 'Tires_BaseColor_Baked.png')
    tires_img = Image.open(tires_src).convert('RGB').resize((512, 512), Image.Resampling.LANCZOS)
    tires_out = os.path.join(OUT_DIR, 'ar_tires_basecolor.png')
    tires_img.save(tires_out, 'PNG', optimize=True)

    wnorm_src = os.path.join(TEX_SRC, 'Wheels_Normal.png')
    wnorm_img = Image.open(wnorm_src).convert('RGB').resize((512, 512), Image.Resampling.LANCZOS)
    wnorm_out = os.path.join(OUT_DIR, 'ar_wheels_normal.png')
    wnorm_img.save(wnorm_out, 'PNG', optimize=True)

    lgt_src = os.path.join(TEX_SRC, 'LIGHTS_BaseColor_AR.png')
    lgt_img = Image.open(lgt_src).convert('RGB').resize((512, 512), Image.Resampling.LANCZOS)
    lgt_out = os.path.join(OUT_DIR, 'ar_lights_basecolor.png')
    lgt_img.save(lgt_out, 'PNG', optimize=True)

    print('All AR baked textures ready in', OUT_DIR)


if __name__ == '__main__':
    main()
