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

import {GeometryGroup} from './GeometryGroup';
import {Attribute} from './Attribute';
import {glType} from './glType';
import {Texture} from '../Texture';

let UNDEF;

class GeometryBuffer {
    groups: GeometryGroup[] = [];

    private size: number;

    attributes: { [name: string]: Attribute } = {};

    texture?: Texture;

    constructor() {
    }

    addGroup(group: GeometryGroup) {
        const groups = this.groups;
        groups[groups.length] = group;
    }

    addAttribute(name: string, attr: Attribute) {
        const data = attr.data;

        if (attr.type == UNDEF) {
            attr.type = glType(data);
        }

        if (attr.stride == UNDEF) {
            attr.stride = 0;
        }

        this.attributes[name] = attr;

        this.size = data.length;
    }

    createGroup(index: number[], type: string): GeometryGroup {
        return new GeometryGroup(index, type, this.size > 65536);
    }

    getAttributes() {
        return this.attributes;
    }

    destroy() {

    }
}


export {GeometryBuffer};
