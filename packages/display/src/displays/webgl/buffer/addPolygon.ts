/*
 * Copyright (C) 2019 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

const flatten = (data: number[][][], tile, tileSize: number, height?: number) => {
    const vertices = [];
    const holes = [];
    let holeIndex = 0;

    let dim = height ? 3 : 2;

    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data[i].length; j++) {
            vertices[vertices.length] = tile.lon2x(data[i][j][0], tileSize);
            vertices[vertices.length] = tile.lat2y(data[i][j][1], tileSize);

            if (height) {
                vertices[vertices.length] = height; // || data[i][j][2]^0;
            }
        }
        if (i > 0) {
            holeIndex += data[i - 1].length;
            holes[holes.length] = holeIndex;
        }
    }

    return {
        vertices: vertices,
        holes: holes,
        dimensions: dim // data[0][0].length
    };
};

const addPolygon = (vertex, coordinates, tile, tileSize: number, extrude?: number) => {
    let flat;
    if (typeof coordinates[0][0][0] != 'number') { // MultiPolygon
        for (let poly of coordinates) {
            flat = flatten(poly, tile, tileSize, extrude);
            vertex.push.apply(vertex, flat.vertices);
        }
    } else {
        flat = flatten(coordinates, tile, tileSize, extrude);
        vertex.push.apply(vertex, flat.vertices);
    }

    return flat;
};

export {addPolygon};
