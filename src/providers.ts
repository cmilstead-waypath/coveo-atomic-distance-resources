export class NavigatorPositionProvider {
  // Method to get the current position using the browser's geolocation API
  getPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      // Setting options for the geolocation request
      const options: PositionOptions = {
        timeout: 5000,             // Set timeout to 5 seconds
        maximumAge: 900000,        // Set maximum age to 15 minutes
        enableHighAccuracy: false, // Set high accuracy to false
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              // User denied the request for Geolocation
              reject(new Error('User denied Geolocation'));
              break;
            case error.POSITION_UNAVAILABLE:
              // Location information is unavailable
              reject(new Error('Location information is unavailable'));
              break;
            case error.TIMEOUT:
              // The request to get user location timed out
              reject(new Error('Geolocation request timed out'));
              break;
            default:
              // An unknown error occurred
              reject(new Error('An unknown geolocation error occurred'));
              break;
          }
        },
        options
      );
    });
  }
}

export class LatLngCookiePositionProvider {
  private latLngCookie: string;
  constructor(latLngCookie) {
    this.latLngCookie = latLngCookie;
  }

  getPosition(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve) => {
      resolve({
        latitude: parseFloat(this.latLngCookie.split('|')[0]),
        longitude: parseFloat(this.latLngCookie.split('|')[1])
      })
    });
  }
}

export class StaticPositionProvider {
  private latitude: number;
  private longitude: number;

  constructor(latitude: number, longitude: number) {
    this.latitude = latitude;
    this.longitude = longitude;
  }

  getPosition(): Promise<{ latitude: number; longitude: number }> {
    // Simply resolve the promise with the static latitude and longitude values
    return Promise.resolve({
      latitude: this.latitude,
      longitude: this.longitude,
    });
  }
}


  /**
   * The `IGeolocationPosition` interface describes a geolocation position
   * usable by the [DistanceResources]{@link DistanceResources} component.
   */
  export interface IGeolocationPosition {
    longitude: number;
    latitude: number;
  }
  /**
   * The `IGeolocationPositionProvider` interface describes an object with a method that can provide
   * a geolocation position to the [DistanceResources]{@link DistanceResources} component.
   */
  export interface IGeolocationPositionProvider {
    getPosition(): Promise<IGeolocationPosition>;
  }
  /**
   * The `IResolvingPositionEventArgs` interface describes the object that all
   * [`onResolvingPosition`]{@link DistanceEvents.onResolvingPosition} event handlers receive as an argument.
   */
  export interface IResolvingPositionEventArgs {
    /**
     * The array of providers that can provide a position. The first provider that can resolve the position will be used.
     */
    providers: IGeolocationPositionProvider[];
  }
  /**
   * The `IPositionResolvedEventArgs` interface describes the object that all
   * [`onPositionResolved`]{@link DistanceEvents.onPositionResolved} event handlers receive as an argument.
   */
  export interface IPositionResolvedEventArgs {
    /**
     * The position that was resolved.
     */
    position: IGeolocationPosition;
  }
  /**
   * The `DistanceEvents` static class contains the string definitions of all events related to distance
   * list.
   *
   * See [Events](https://docs.coveo.com/en/417/).
   */

  export class DistanceEvents {

  /**
   * Triggered when the [`DistanceResources`]{@link DistanceResources} component successfully resolves the position.
   *
   * All `onPositionResolved` event handlers receive a [`PositionResolvedEventArgs`]{@link IPositionResolvedEventArgs}
   * object as an argument.
   *
   * @type {string} The string value is `onPositionResolved`.
   */
  static onPositionResolved: string;
  /**
   * Triggered when the [`DistanceResources`]{@link DistanceResources} component tries to resolve the position.
   *
   * All `onResolvingPosition` event handlers receive a
   * [`ResolvingPositionEventArgs`]{@link IResolvingPositionEventArgs} object as an argument.
   *
   * **Note:**
   * > You should bind a handler to this event if you want to register one or several new position providers.
   *
   * @type {string} The string value is `onResolvingPosition`.
   */
  static onResolvingPosition: string;
  /**
   * Triggered when the [`DistanceResources`]{@link DistanceResources} component fails to resolve the position.
   *
   * **Note:**
   * > You should bind a handler to this event if you want to display an error message to the end user, or hide
   * > components that cannot be used.
   *
   * @type {string} The string value is `onPositionNotResolved`.
   */
  static onPositionNotResolved: string;
}
