import {
	BufferAttribute,
	TriangleStripDrawMode,
	TrianglesDrawMode,
	TriangleFanDrawMode
} from 'three';

function toTrianglesDrawMode( geometry, drawMode ) {
	if ( drawMode === TrianglesDrawMode ) {
		return geometry;
	}
	if ( drawMode === TriangleFanDrawMode ) {
		let index = geometry.getIndex();
		if ( index === null ) {
			const indices = [];
			const position = geometry.getAttribute( 'position' );
			if ( position !== undefined ) {
				for ( let i = 1; i < position.count - 1; i ++ ) {
					indices.push( 0, i, i + 1 );
				}
				geometry.setIndex( indices );
			}
			return geometry;
		}
	} else if ( drawMode === TriangleStripDrawMode ) {
		let index = geometry.getIndex();
		if ( index === null ) {
			const indices = [];
			const position = geometry.getAttribute( 'position' );
			if ( position !== undefined ) {
				for ( let i = 0; i < position.count - 2; i ++ ) {
					if ( i % 2 === 0 ) {
						indices.push( i, i + 1, i + 2 );
					} else {
						indices.push( i + 2, i + 1, i );
					}
				}
				geometry.setIndex( indices );
			}
			return geometry;
		}
	}
	return geometry;
}

export { toTrianglesDrawMode };
