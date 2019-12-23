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

import {Attribute} from './Attribute';
import {glType} from './glType';
import {Texture} from '../Texture';


const GL_UNSIGNED_SHORT = 0x1403;
const GL_UNSIGNED_INT = 0x1405;

let UNDEF;

type Index = {
    data: Uint16Array | Uint32Array
    type: number;
    length: number;
};

type Arrays = {
    first: number;
    count: number;
    mode?: number;
};

type Uniform = number | number[];


class GeometryGroup {
    // type: 'Point'|'LineString'|'Polygon'

    type: string;
    // index: Uint16Array | Uint32Array;

    index: Index;
    arrays: Arrays;

    attributes: { [name: string]: Attribute } = {};
    uniforms: { [name: string]: Uniform } = {};

    alpha: boolean;

    texture: Texture = null;

    zIndex: number;
    scissor: boolean;
    depth: boolean;
    blend: true;

    constructor(index: Arrays | number[], type: string, is32bitIndex?: boolean) {
        if (index instanceof Array) {
            this.index = is32bitIndex
                ? {
                    data: new Uint32Array(index),
                    type: GL_UNSIGNED_INT,
                    length: index.length
                }
                : {
                    data: new Uint16Array(index),
                    type: GL_UNSIGNED_SHORT,
                    length: index.length
                };
        } else {
            this.arrays = index;
        }

        this.type = type;
    }

    addUniform(name: string, uniform: Uniform) {
        this.uniforms[name] = uniform;
    }

    addAttribute(name: string, attribute: Attribute) {
        attribute.type = glType(attribute.data);

        if (attribute.stride == UNDEF) {
            attribute.stride = 0;
        }

        this.attributes[name] = attribute;
    }

    getUniform(name: string): Uniform {
        return this.uniforms[name];
    }

    getAttributes() {
        return this.attributes;
    }

    hasAlpha(): boolean {
        return this.alpha;
    }

    // texture(texture?: Texture): Texture {
    //     if (texture) {
    //         if (this.tex) {
    //             this.tex.destroy();
    //         }
    //         this.tex = texture;
    //     }
    //     return this.tex;
    // }
}


export {GeometryGroup};
