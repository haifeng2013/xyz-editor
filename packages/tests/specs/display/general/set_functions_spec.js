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
import {displayTests, prepare} from 'hereTest';
import {Map} from '@here/xyz-maps-core';
import chai from 'chai/chai';
import dataset from './set_functions_spec.json';

describe('set functions', function() {
    const expect = chai.expect;

    let display;

    before(async function() {
        let preparedData = await prepare(dataset);
        display = new Map(document.getElementById('map'), {
            center: {longitude: 77.79802, latitude: 12.62214},
            zoomLevel: 18,
            layers: preparedData.getLayers()
        });
    });

    after(async function() {
        display.destroy();
    });

    it('validate map display has correct values', async function() {
        expect(display.getCenter()).to.deep.equal({longitude: 77.79802, latitude: 12.62214});
        expect(display.getHeight()).to.equal(600);
        expect(display.getWidth()).to.equal(800);
        expect(display.getLayers()).to.have.lengthOf(4);
        expect(display.getViewBounds()).to.deep.equal({
            minLon: 77.7958742327881,
            minLat: 12.620569563312458,
            maxLon: 77.80016576721192,
            maxLat: 12.623710427048564
        });
        expect(display.getZoomlevel()).to.equal(18);
    });

    it('set map center zoomlevel and validate', async function() {
        await displayTests.waitForViewportReady(display, ()=>{
            display.setCenter(77.75143321945194, 12.62290951045827);
        });

        expect(display.getCenter()).to.deep.equal({longitude: 77.75143321945194, latitude: 12.62290951045827});


        await displayTests.waitForViewportReady(display, ()=>{
            display.setZoomlevel(19);
        });

        expect(display.getZoomlevel()).to.deep.equal(19);

        await displayTests.waitForViewportReady(display, ()=>{
            display.setZoomlevel(17.5);
        });

        expect(display.getCenter()).to.deep.equal({
            longitude: 77.75143321945194, latitude: 12.622909510458271
        });

        expect(display.getHeight()).to.equal(600);
        expect(display.getWidth()).to.equal(800);
        expect(display.getLayers()).to.have.lengthOf(4);
        expect(display.getViewBounds()).to.deep.equal({minLon: 77.74857219650266, minLat: 12.620815599030237, maxLon: 77.75429424240116, maxLat: 12.625003404749322});
        expect(display.getZoomlevel()).to.equal(17.5);
    });
});
