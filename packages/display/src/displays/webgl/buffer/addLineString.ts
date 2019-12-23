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

type Cap = false | 'round' | 'butt' | 'square';
type Join = false | 'round' | 'bevel' | 'miter';

const normalize = (p) => {
    let x = p[0];
    let y = p[1];
    let len = x * x + y * y;
    if (len > 0) {
        len = 127 / Math.sqrt(len);
        // len = 32767 / Math.sqrt(len);
        p[0] = x * len;
        p[1] = y * len;
    }
    return p;
};

const addIndices = (iStart: number, segments: number, vIndex: number[], cap?: boolean|Cap) => {
    // cap = cap && cap != 'square';

    let sLength = 6; // 4 + 2 * Number(cap);
    for (let c = iStart, len = iStart + (segments - 1) * sLength; c <= len; c += sLength) {
        vIndex.push(
            c + 1, c + 2, c,
            c + 3, c + 2, c + 1
        );

        if (cap == 'round') {
            vIndex.push(
                c + 1, c, c + 4,
                c + 3, c + 5, c + 2
            );
        } else if (cap) {
            if (c > iStart) {
                // vIndex.push(c + 1, c, c + 4);


                vIndex.push(c + 1, c, c + 4);


                // vIndex.push(
                //     c + 3, c + 5, c + 2
                // );
            }
        }
    }
};

const addLineString = (vertex, normal, lengthSoFar: number[], vIndex, coordinates, tile, tileSize: number, cap?: Cap, join?: Join) => {
    let totalLength = 0;
    let segments = 0;
    let iStart = vertex.length / 2;
    const vLength = coordinates.length;
    let x1 = tile.lon2x(coordinates[0][0], tileSize);
    let y1 = tile.lat2y(coordinates[0][1], tileSize);
    let x2;
    let y2;
    let dx;
    let dy;
    let len;
    let nx;
    let ny;
    let length;

    const addCap = cap && cap != 'square';

    for (let c = 1; c < vLength; c++) {
        x2 = tile.lon2x(coordinates[c][0], tileSize);
        y2 = tile.lat2y(coordinates[c][1], tileSize);

        dx = x1 - x2;
        dy = y1 - y2;

        if (!dx && !dy) {
            continue;
        }

        // simple for now :o)
        //          p1.1                        p2.1
        //         / *---------------------------* \
        //       /   |                           |   \
        //     /     |                           |     \
        // p1.0 --- p1 ------------------------- p2 --- p2.0
        //     \     |                           |     /
        //       \   |                           |   /
        //         \ *---------------------------* /
        //          p1.2                        p2.2

        // add vertex data
        vertex.push(
            x1, y1,
            x1, y1,
            x2, y2,
            x2, y2
            // ,x1, y1,
            // x2, y2
        );


        len = Math.sqrt(dx * dx + dy * dy);

        if (lengthSoFar) {
            length = totalLength + len;
            lengthSoFar.push(
                totalLength, totalLength, length, length
                // , totalLength, length
            );
        }

        len = 127 / len; // 8bit -127...+127


        nx = dx * len;
        ny = dy * len;

        // vec12 = normalize([dx, dy]);

        normal.push(
            ny, -nx, // p1.1
            -ny, nx, // p1.2
            ny, -nx, // p2.1
            -ny, nx // p2.2
        );


        // if (c == vLength - 1) { // first/last segment
        //     console.log(c);
        // }

        // if (addCap ||
        //     c != vLength - 1 // middle segment (!first&&!last)
        // ) {
        vertex.push(
            x1, y1,
            x2, y2
        );
        normal.push(
            nx, ny, // p1.0
            -nx, -ny // p2.0
        );
        lengthSoFar.push(totalLength, length);
        // }

        x1 = x2;
        y1 = y2;

        segments++;
        totalLength += length;
    }

    addIndices(iStart, segments, vIndex, cap);

    return segments;
};

export {addLineString, addIndices, normalize};
