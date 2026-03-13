// Type shim for leaflet.vectorgrid.
// The library extends the L namespace as a side effect of import.
import 'leaflet';

declare module 'leaflet' {
    namespace vectorGrid {
        function protobuf(url: string, options?: any): Layer;
    }
    namespace canvas {
        function tile(options?: any): any;
    }
}