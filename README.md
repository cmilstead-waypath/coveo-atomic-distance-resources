# atomic-distance-resources



<!-- Auto Generated Below -->


## Properties

| Property                           | Attribute              | Description                                                                                                                                          | Type                 | Default       |
| ---------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------- |
| `defaultLatitude`                  | `default-latitude`     | The default latitude value to be used if no other location is provided.                                                                              | `number`             | `33.9348279`  |
| `defaultLongitude`                 | `default-longitude`    | The default longitude value to be used if no other location is provided.                                                                             | `number`             | `-84.3546017` |
| `distanceField` _(required)_       | `distance-field`       | Specifies the name of the field in which to store the distance value.                                                                                | `string`             | `undefined`   |
| `geospatialDistances` _(required)_ | `geospatial-distances` | The array of geospatial distances, as a string (e.g., `"[25, 50, 100]"`), which will be parsed and converted into options for the distance dropdown. | `string \| string[]` | `undefined`   |
| `googleApiKey` _(required)_        | `google-api-key`       | A valid Google API key to be used for geocoding a city or postal code.                                                                               | `string`             | `undefined`   |
| `latitudeField` _(required)_       | `latitude-field`       | Specifies the name of the field that contains the latitude value.                                                                                    | `string`             | `undefined`   |
| `longitudeField` _(required)_      | `longitude-field`      | Specifies the name of the field that contains the longitude value.                                                                                   | `string`             | `undefined`   |
| `useNavigator`                     | `use-navigator`        | Whether to request the geolocation service of the web browser. If not defined, will not try to request the service. Defaults to `true`.              | `boolean`            | `true`        |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
