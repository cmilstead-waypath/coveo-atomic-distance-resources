import { Bindings, initializeBindings } from '@coveo/atomic';
import { Component, Prop, Element, h, State } from '@stencil/core';
import {
  SearchStatusState,
  buildSearchStatus,
  SearchEngine,
  Unsubscribe,
  loadAdvancedSearchQueryActions,
  loadSearchActions,
  loadSearchAnalyticsActions
} from '@coveo/headless';
import {
  NavigatorPositionProvider, StaticPositionProvider, IGeolocationPositionProvider, IGeolocationPosition, LatLngCookiePositionProvider
} from '../src/providers';

@Component({
  tag: 'atomic-distance-resources',
  styleUrl: 'atomic-distance-resources.css',
  shadow: false,
})
export class AtomicDistanceResources {
  // The Atomic bindings to be resolved on the parent atomic-search-interface.
  // Used to access the Headless engine in order to create controllers, dispatch actions, access state, etc.
  private bindings?: Bindings;

  // We recommend recording possible errors thrown during the configuration.
  @State() private error?: Error;

  // When disconnecting components from the page, we recommend removing
  // state change listeners as well by calling the unsubscribe methods.
  private statusUnsubscribe: Unsubscribe = () => { };

  @Element() private element!: HTMLElement;

  // Headless controller state property, using the `@State()` decorator.
  // Headless will automatically update these objects when the state related
  // to the controller has changed.
  @State() private statusState!: SearchStatusState;
  @State() searchEngine!: SearchEngine; // Assume this is passed down from atomic-search-interface
  @State() distance: string = '1000000';
  @State() distanceValues: string[] = [];
  @State() unit: 'Miles' | 'Kilometers' = 'Miles';
  @State() location: string;

  private latitude: number;
  private longitude: number;
  private distances: Map<string, string> = new Map();

  /**
   * Specifies the name of the field in which to store the distance value.
   */
  @Prop() distanceField!: string;
  /**
 * Specifies the name of the field that contains the latitude value.
 */
  @Prop() latitudeField!: string;
  /**
* Specifies the name of the field that contains the longitude value.
*/
  @Prop() longitudeField!: string;
  /**
 * Whether to request the geolocation service of the web browser. If not defined, will not try to request the service.
 * Defaults to `true`.
 */
  @Prop() useNavigator: boolean = true;
  /**
 * The default latitude value to be used if no other location is provided.
 * 
 */
  @Prop() defaultLatitude: number = 33.9348279;
  /**
  * The default longitude value to be used if no other location is provided.
  */
  @Prop() defaultLongitude: number = -84.3546017;
  /**
  * A valid Google API key to be used for geocoding a city or postal code.
  */
  @Prop() googleApiKey!: string;
  /**
    * The array of geospatial distances, as a string (e.g., `"[25, 50, 100]"`), which will be parsed
    * and converted into options for the distance dropdown.
    */
  @Prop() geospatialDistances!: string[] | string;

  componentWillLoad() {
    this.registerDistanceValues();
  }

  // We recommend initializing the bindings and the Headless controllers
  // using the `connectedCallback` lifecycle method with async/await.
  // Using `componentWillLoad` will hang the parent atomic-search-interface initialization.
  public async connectedCallback() {
    try {
      // Wait for Atomic to load and initialize
      await customElements.whenDefined('atomic-search-interface');
      this.bindings = await initializeBindings(this.element);

      // Initialize the status controller
      const statusController = buildSearchStatus(this.bindings.engine);
      this.searchEngine = this.bindings.engine;

      // Subscribe to state changes
      this.statusUnsubscribe = statusController.subscribe(() => {
        this.statusState = statusController.state
      });

      this.registerDistanceValues()

      // Set up location providers and try to set the position
      const providers = this.getProvidersFromOptions();
      await this.tryToSetPositionFromProviders(providers);
    } catch (error) {
      console.error(error);
      this.error = error as Error;

      // Fallback to trigger the search even if an error occurs
      if (this.searchEngine) {
        this.searchEngine.executeFirstSearch();
      }
    }
  }

  // The `disconnectedCallback` lifecycle method should be used to unsubcribe controllers and
  // possibly the i18n language change listener.
  public disconnectedCallback() {
    this.statusUnsubscribe();
  }

  /**
 * Overrides the current position with the provided values.
 *
 * **Note:**
 * > Calling this method does not automatically trigger a query.
 *
 * @param latitude The latitude to set.
 * @param longitude The longitude to set.
 */
  public setPosition(latitude: number, longitude: number): void {
    this.latitude = latitude;
    this.longitude = longitude;
    this.applyGeospatialFilter();
  }

  private getLatLngCookie() {
    var i, x, y, ARRcookies = document.cookie.split(';');
    for (i = 0; i < ARRcookies.length; i++) {
      if (x = ARRcookies[i].substr(0, ARRcookies[i].indexOf('=')), y = ARRcookies[i].substr(ARRcookies[i].indexOf('=') + 1), 'lat_lgn' == (x = x.replace(/^\s+|\s+$/g, ''))) return unescape(y);
    }
    return ''
  }

  private async tryToSetPositionFromProviders(providers: IGeolocationPositionProvider[]): Promise<void> {
    try {
      const position = await this.tryGetPositionFromProviders(providers);

      if (position) {
        this.setPosition(position.latitude, position.longitude);
      } else {
        // If no position is found, trigger a fallback behavior
        this.setPosition(this.defaultLatitude, this.defaultLongitude);
      }
    } catch (error) {
      if (error.message !== "User denied Geolocation" || error.message !== "User denied geolocation prompt") {
        this.error = error as Error;
      }
      this.setPosition(this.defaultLatitude, this.defaultLongitude);
    }
    // Default behavior: Execute the first search
    this.searchEngine.executeFirstSearch();
  }

  private async tryGetPositionFromProviders(providers: IGeolocationPositionProvider[]): Promise<IGeolocationPosition | null> {
    while (providers.length > 0) {
      const provider = providers.shift();
      try {
        const position = await provider.getPosition();
        if (position?.latitude && position?.longitude) {
          return position; // Return the first valid position
        }
        else {
          return null;
        }
        // No else needed, as position null will continue the loop
      } catch (error) {
        if (error.message === 'User denied Geolocation' || error.message === "User denied geolocation prompt") {
          console.warn('User denied geolocation permission.');
        } else {
          this.error = error;
          console.warn('Error resolving position from provider:', error);
        }
        // If no position was found from any providers
        return null;
      }
    }
  }

  private getProvidersFromOptions(): IGeolocationPositionProvider[] {
    const providers: IGeolocationPositionProvider[] = [];

    var cookie = this.getLatLngCookie();

    if (cookie.length > 0) {
      providers.push(new LatLngCookiePositionProvider(cookie));
    }

    if (this.useNavigator) {
      providers.push(new NavigatorPositionProvider());
    }

    if (this.defaultLatitude && this.defaultLongitude) {
      providers.push(new StaticPositionProvider(this.defaultLatitude, this.defaultLongitude));
    }

    return providers;
  }

  private async applyGeospatialFilter() {
    if (!this.latitude && !this.longitude && !this.distance) {
      console.error("Location and distance not set.");
      return;
    }

    try {
      const radiusInMeters = this.convertDistanceToMeters(this.distance);
      const geoQueryExp = this.getGeoQueryExpression(this.latitude, this.longitude, radiusInMeters);
      const action1 = loadAdvancedSearchQueryActions(this.searchEngine).updateAdvancedSearchQueries({
        aq: geoQueryExp
      });

      // Dispatch the action to update the advanced query
      this.searchEngine.dispatch(action1);

      // Explicitly execute a new search
      const { executeSearch } = loadSearchActions(this.searchEngine);
      const { logInterfaceLoad } = loadSearchAnalyticsActions(this.searchEngine);

      // Dispatch the action with an analytics event
      this.searchEngine.dispatch(executeSearch(logInterfaceLoad()));
    } catch (error) {
      //this.error = error as Error;
      console.error("Failed to apply distance sorting", error);
    }
  }

  private async resolveLocationToCoordinates(location: string): Promise<{ latitude: number, longitude: number }> {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${this.googleApiKey}&sensor=false`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const latitude = data.results[0].geometry.location.lat;
        const longitude = data.results[0].geometry.location.lng;
        return { latitude, longitude };
      } else {
        console.error('Geocoding API error:', data.status);
        return Promise.reject('Failed to resolve location');
      }
    } catch (error) {
      console.error('Error calling the Geocoding API', error);
      this.error = error as Error;
      return Promise.reject(error);
    }
  }

  private getGeoQueryExpression(latitude: number, longitude: number, radius: number) {
    return `(@distance <= ${radius}) $qf(function:'dist(@${this.latitudeField}, @${this.longitudeField}, ${latitude}, ${longitude})', fieldName: 'distance')`;
  }

  private registerDistanceValues() {
    let distancesArray: string[] = [];

    if (typeof this.geospatialDistances === 'string') {
      try {
        // Parse the string into an array
        distancesArray = JSON.parse(this.geospatialDistances);

        // Validate that the parsed array is actually an array
        if (!Array.isArray(distancesArray)) {
          throw new Error('Parsed geospatialDistances is not an array.');
        }
      } catch (error) {
        console.error('Error parsing geospatialDistances:', error);
        this.distanceValues = [];
        return; // Stop further processing if parsing fails
      }
    } else {
      console.error(
        'geospatialDistances must be a string representation of an array.'
      );
      this.distanceValues = [];
      return; // Stop further processing if geospatialDistances is not a string
    }

    // Validate that each item in the array is a valid number or a numeric string
    const validDistances = distancesArray.every((value) =>
      !isNaN(Number(value))
    );

    if (validDistances) {
      // Initialize the distances array with "Any Distance"
      this.distanceValues = ['1000000'];

      // Convert all values to strings to ensure consistency
      this.distanceValues = this.distanceValues.concat(
        distancesArray.map((value) => String(Number(value)))
      );

      // Generate distance labels based on the unit (Miles or Kilometers)
      const distanceLabels = this.unit === 'Miles'
        ? ['Any Distance', ...distancesArray.map((value) => `${Number(value)} Miles`)]
        : ['Any Distance', ...distancesArray.map((value) => `${Number(value)} Kilometers`)];

      // Check length match before creating the Map
      if (distanceLabels.length !== this.distanceValues.length) {
        console.error('Mismatch between distance labels and values length:', distanceLabels, this.distanceValues);
        return;
      }

      // Create a Map of labels to values
      this.distances = new Map(
        distanceLabels.map((label, index) => [label, this.distanceValues[index]])
      );
    } else {
      console.error(
        'geospatialDistances must be an array of numeric values or numeric strings. (i.e. [25, 50] or ["25", "50"]).'
      );
      this.distanceValues = [];
    }
  }

  async handleLocationInput(event: KeyboardEvent | Event) {
    const inputElement = event.target as HTMLInputElement;
    const errorMessage = document.getElementById('error-message');

    if (event instanceof KeyboardEvent && event.key !== 'Enter') {
      return;
    }

    this.location = inputElement.value.trim();

    if (!this.location.trim()) {
      errorMessage.textContent = 'Please enter a valid city or postal code.';
      inputElement.setAttribute('aria-invalid', 'true');
      inputElement.focus();
    } else {
      try {
        const { latitude, longitude } = await this.resolveLocationToCoordinates(this.location.trim());
        this.setPosition(latitude, longitude);
        errorMessage.textContent = '';  // Clear error message
        inputElement.setAttribute('aria-invalid', 'false');  // Mark input as valid
      } catch (error) {
        // Handle invalid location or API error
        errorMessage.textContent = 'Location not found. Please enter a valid city or postal code.';
        inputElement.setAttribute('aria-invalid', 'true');
        inputElement.focus();
      }
    }
  }

  setUnit(unit: 'Miles' | 'Kilometers') {
    this.unit = unit;
    this.registerDistanceValues();
    this.applyGeospatialFilter();
  }

  setDistance(event: Event) {
    this.distance = (event.target as HTMLSelectElement).value;
    this.applyGeospatialFilter();
  }

  private convertDistanceToMeters(distance: string): number {
    const value = parseFloat(distance.split(' ')[0]); // Extracting the numeric value
    if (this.unit === 'Miles') {
      return value * 1609.34; // Miles to meters conversion factor
    } else { // Kilometers
      return value * 1000; // Kilometers to meters conversion factor
    }
  }

  render() {
    if (this.error) {
      return (
        <atomic-component-error element={this.element} error={this.error}></atomic-component-error>
      );
    }

    if (!this.bindings || !this.statusState.hasResults) {
      return;
    }

    return (
      <div class="distance-panel">
        <div class="filter-title">Distance</div>
        <div class="distance-metric-rb">
          <input type="radio" id="kilometers" name="unit" value="Kilometers" checked={this.unit === 'Kilometers'} onChange={() => this.setUnit('Kilometers')} />
          <label htmlFor="kilometers">Kilometers</label>
          <input type="radio" id="miles" name="unit" value="Miles" checked={this.unit === 'Miles'} onChange={() => this.setUnit('Miles')} />
          <label htmlFor="miles">Miles</label>
        </div>

        <div class="form-container">
          <div class="distance-field">
            <div class="locDistance">
              <select class="no-selectize no-bg" onInput={(event) => this.setDistance(event)}>
                {Array.from(this.distances.entries()).map(([key, value]) => (
                  <option value={value}>{key}</option>
                ))}
              </select>
            </div>
          </div>

          <div class="seperator">
            from
          </div>

          <div class="postal-code-box">
            <input
              id="location-filter"
              class="location-filter-setLocation"
              type="text"
              placeholder="Postal Code/City"
              aria-label="Enter Postal Code or City"
              aria-invalid="false"
              onKeyDown={(event) => this.handleLocationInput(event)} />
            <div id="error-message" aria-live="assertive" role="alert"></div>
          </div>
        </div>
      </div>
    );
  }
}
