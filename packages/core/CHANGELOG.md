## 0.9.35 (2019-11-15)
* added:  support for remote filtering by using property search in SpaceProvider
* added:  HTTPProviders support setting of multiple value parameter by using array as value. By using undefined as value the parameter gets cleared/removed.

## 0.9.34 (2019-10-25)
### display
* fixed:  destroying display may error in case of layer copyright hasn't been loaded yet
### editor
* fixed:  navlinks are getting reselected in case of modified by transformer
* fixed:  selected and hovered editstates are not set for place/address features
* fixed:  turn restrictions on oneways can be edited in the opposite direction
* fixed:  search single feature by id via editor.search(...) returns empty result
* fixed:  do not trigger ready observers in case of editor is initialized without any layer
* updated:  trigger ready observers even though added layer is ready already
### core
* changed:  use "application/json" accept header for space and remove requests of SpaceProvider
* fixed:  error triggering in case of copyright request fails

## 0.9.33 (2019-7-30)
### core
* fixed: ImageTile receivers can get executed multiple times
* fixed: trigger layer.viewportReady even though containing tile request(s) failed
* added: remove multiple feature at once by passing array of features to provider.removeFeature(...)
* fixed: return provider instance feature(s) on remote search by id(s)
### display
* added: hide specific feature(s) by using layer.setStyleGroup( feature, false );
* added: previous set custom feature styles can now be reused when setting new LayerStyle via layer.setStyle( layerStyle, true )
* fixed: pointerevents are not getting triggered correctly in case of Circle StyleGroup contains value-function which depends on zoomlevel
* fixed: display.destroy() errors in case of layersetup is using a SpaceProvider with custom copyright information
* fixed: geoToPixel(...) produces incorrect results in case of latitude is close to poles
### editor
* added: Navlink, Place and Address features are now editable with SpaceProvider
* added: Hook and Attribute reader/writer interfaces to allow editing of any datamodel
* fixed: possibility to create invalid area geometries with drawingboard
* fixed: add/remove layer with multiprovider setup throws exception
* fixed: do not set ready state in case of required tile request(s) failed
* fixed: geometry typo in CROSSING and CROSSING_CANDIDATE features
* fixed: auto reselect of already unselected feature after layer visibility change
* fixed: EditorOverlay positioning is not taking care of Linklayer if present
* added: use multiple Editor instances in parallel
* fixed: connect crossing-candidate with connected links errors
* fixed: update link direction display if direction is getting changed with property setter
* added: detailed data for navlink.getConnectedLinks(...) including node index of connected links
* added: mh-edit-state (maphub namespace) of ProProvider features are in sync with feature edit states now
* fixed: retrieve null values via address.prop(property) fails
### general
* added: provide additional ES6 builds for all modules
* added: all modules are providing named exports

## 0.9.32 (2019-5-9)
### editor
* fixed: possibility to create Area with invalid geometry via drawingboard
* fixed: drawingboard is set to inactive in case of create is not allowed
### display
* fixed: wrong map size in case of display gets resized when retina mode is active or scale is applied
### core
* fixed: return provider instance feature(s) on remote search by id(s)

## 0.9.31 (2019-4-4)
### editor
* fixed: place drawingboard at the very top, regardless of link-layer's presence
### core
* fixed: only first tag is sent if url parameters are changed for SpaceProvider
### plugins
* added: support for 1024 pixel tileSize in MVTLayer
### general
* workaround: (timing critical) in case of display got destroyed and listener is waiting for async execution.
### display
* added: UI support for expandable copyright information
* added: trigger "resize" event on map resize
### common
* added: Map.forEach(...)
* fixed: delete item in Set has no effect

## 0.9.30 (2019-3-26)
### editor
* fixed: ProProvider ignores custom headers
* fixed: submit of removed Navlink with invalid geometry. (2 coordinates total at same position)
### display
* fixed: background color change is getting ignored on layer style change
* added: style property "zIndex" can also be defined as function
* fixed: pointerevent triggering is not disabled during pan/zoom animations
* fixed: renderer can break in case of user defines invalid style/styleGroup.
* added: ui components use random class identifiers to prevent possible css conflicts
### plugins
* added: fetch copyright information for MVTProvider pointing to versioned herebase tiles
### core
* updated: aligned layer/provider event listener types
* added: SpaceProvider is handling credentials as parameters and can now be changed with provider.setParam(...)
* fixed: remote search query breaks in case of whole world (-180;+180) is requested

## 0.9.29 (2019-2-21)
### display
* fixed: pointerevent triggering ignores zIndex for stacked (multi)polygons
* fixed: try to recreate tile preview if none is available
* fixed: messed up tile rotation in case of LineString geometries + Point rendering
### plugins
* updated: improved tile index creation performance of MVTProvider
### editor
* fixed: ProProvider does not send custom corsh headers for non tile requests
### core
* fixed: withCredentials option is ignored by derived HTTPProviders
* fixed: RemoteTileProvider returns incorrect result or aborts remote search queries in case of containing tiles are already in loading state

## 0.9.28 (2018-12-6)
### plugins
* added: allow to pass custom headers for MVTLayer
* fixed: send correct accept header for MVTProvider requests
### core
* added: implemented generic HTTPProvider
* added: allow to set custom parameters and headers for all derived HTTPProviders
* added: onError callback for space definition requests
### editor
* fixed: edit turn restrictions fails in case of Navlink data is only providing a single side ("ref" or "nref")
### display
* fixed: do not render text stroke in case of strokeWidth is set to 0
* fixed: Element does not need to be in DOM for Map init
* fixed: remove layer event listeners when map gets destroyed
* fixed: Point rendering ignores applied rotation/dimension in case of points are located on same position
* added: in case of local data is added to remote provider, refresh screen before remote data is fetched.
* added: render (Multi)Polygon geometries as Text, Circle, Rect or Image (center of bounding box)

## 0.9.27 (2018-10-2)
* fixed: source copyright info not displayed correctly

## 0.9.26 (2018-10-2)
### editor
* fixed: no fill color for Line shapes is used with certain line styles
### display
* fixed: Points rendered as Text will display "undefined" if property doesn't exist
* fixed: no pointerevents for Rects if defined by width only
* added: support for placing Image/Rect/Circle on LineString segments by using style "offset" property.
* changed:  static HERE copyright is only displayed if no source copyright is available.

## 0.9.25 (2018-9-25)
### plugins
* fixed: tileSize gets ignored if defined in remote config for MVTLayer
### display
* fixed: take care of layer/provider level setup for copyright info

## 0.9.24 (2018-9-25)
* added: show copyright information for different zoomlevel
* fixed: src can't be defined via style functions for image renderer

## 0.9.23 (2018-9-24)
### core
* fixed: commit deleted feature(s) only won't trigger success callbacks for spaceprovider
### editor
* fixed: ie11 errors because of multiply property definition
* added: custom styling for drawingboard. use: drawingBoard.start({styleGroup:[{..}]})
* fixed: deadlock submission in case of removed feature of spaceprovider is included.
* added: custom styles for turnrestriction editor can no be set via overlaystyles
* added: expose overlay stylesGroups to allow easy overwriting
* fixed: editor overlay may not be placed on top in drawingorder for certain layersetups
### display
* fixed: several rendering issues if dynamic stylevalues (functions) are used
* improved: point rendering performance
* changed: optimised feature bundling
* fixed: possible rendering of Rect/Circle with wrong dimensions.
* added: support for variable render style types using function definition.

## 0.9.22 (2018-8-17)
* updated: documentation
* changed: Tile.row, Tile.col, Tile.level to Tile.x, Tile.y, Tile.z

## 0.9.21 (2018-8-8)
### display
* added: display in pointerevents detail property
* fixed: global alpha resetting is time-sensitive when switching styles using opacity and backgroundColor
* fixed: don not apply unscaled strokeWidth in case scaled strokeWidth (strokeWidthZoomScale) is invalid
### general
* fixed: missing documentation
### editor
* added: layer for pushed features into container can be specified now
* fixed: transform simple Polygon AREA feature fails
* added: line.addShape(..) to userspace API
* added: remove of LINE_SHAPE feature
* added: events for LINE_SHAPE feature (pointerup, tap, dragStart, dragStop)
* fixed: navlink direction hints are not displayed
* changed: icon resources are now directly included in module artefact
* added: full editing support for simple geojson polygons.
* added: basic support for geometry editing of LINE features
* added: specific layer can be accessed by using index. eg: editor.getLayers(1)
* added: allow to specify layer(s) where editor should create certain features when added by: editor.addFeature(...)
* changed: editor is only creating maphup properties for features of maphub provider by default.
* fixed: define id for new editFeatures moved from properties to root

## 0.9.20 (2018-7-31)
### general
* changed: global namespace from HERE.xyz.maps to here.xyz.maps
### editor
* changed: overlay is visible/active from zoomlevel 1 to 20
* added: layer can be specified where drawingboard creates feature in. use: editor.getDrawingboard().start({ layer: tileLayer })
* changed: onShapeAdd,onShapeRemove events of drawingboard are triggering EditEvents
### core
* fixed: LocalProvider is using data if tilestorage overflows

## 0.9.19 (2018-7-26)
* fixed: strokezoomscale styling is ignored for stroke rendering

## 0.9.18 (2018-7-25)
### editor
* added: initial layers to edit can be defined in editorconfig (config.layers)
* fixed: viewport search broken in legacy mode
* fixed: spaceprovider errors while receiving uneditable data when editor packages is loaded.
* fixed: link.prop('property') returns complete feature properties in case of property is undefined
* fixed: broken legacy mode. deprecated and will be removed soon
### display
* changed: strokeWidth can be set to 0 to disable stroke rendering
* fixed: ducktyped style primitives are preferred
* fixed: pointerevent triggering fails if map is initialised without layers
### core
* fixed: make sure locally created space features do have xyz namespace present in properties
* fixed: spaceprovider remote id searches are not returning results
* fixed: spaceprovider.commit() errors if no callback is defined
### general
* fixed: bundle playground not working in case of rollup is not installed globaly

## 0.9.17 (2018-7-11)
### core
* fixed: spaceprovider remote id searches are not returning results
* fixed: spaceprovider.commit() errors if no callback is defined
### editor
* fixed: spaceprovider errors while receiving uneditable data when editor packages is loaded.
* fixed: link.prop('property') returns complete feature properties in case of property is undefined
* fixed: broken legacy mode. deprecated and will be removed soon

## 0.9.16 (2018-6-4)
### plugins
* added: MVTLayer/MVTProvider is providing datasource copyright info in case of xyz backend is used.
### display
* added: copyright UI is displaying Layers datasource copyright information if available
* added: "addLayer" and "removeLayer" events.
* fixed: Map not added to global namespace in case of webpack is used
### general
* fixed: json responses with 204 breaks
* added: make sure global namespace is also available for webpack users.

## 0.9.15 (2018-5-5)
### general
* fixed: editor.destroy() is broken
* fixed: features may be rendered with wrong style if style props are defined by functions
* added: take care of variable zoomlevel for hit detection
### plugins
* fixed: wrong release scriptname

## 0.9.14 (2018-5-4)
### display
* fixed: display.setViewbounds(...) not zooming to correct level in case of geojson bbox is used as parameter
* fixed: no pointerevents for features with style definitions using functions
* fixed: remove UI components if display gets distroyed
### general
* fixed: "module not found" error if artefacts are loaded with webpack
* changed: get global build information "HERE.xyz.maps.build" containing version, date, revision and name

