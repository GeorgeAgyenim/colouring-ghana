import { Point } from 'geojson';
import React, { Component } from 'react';

import './search-box.css';

import { apiGet } from '../apiHelpers';
import { SearchIcon } from '../components/icons';

export interface SearchResult {
    id: number;
    type: string;
    attributes: {
        label: string;
        search_class: string;
        zoom: number;
    };
    geometry: Point;
}


interface SearchBoxProps {
    /** Called with the full set of matches (for map pins + fit-to-bounds); empty array clears them. */
    onResults: (results: SearchResult[]) => void;
    /** Called with the hovered result's id (or null) so its map pin can be emphasised. */
    onResultHover: (id: number | null) => void;
    /** Called when the user picks a result; the map flies to it. */
    onResultSelect: (result: SearchResult) => void;
}

interface SearchBoxState {
    q: string;
    results: SearchResult[];
    searched: boolean;
    /** Message shown when the search request itself failed (as opposed to finding nothing). */
    error: string | null;
    collapsedSearch: boolean;
    smallScreen: boolean;
}

/**
 * Search for location. Searches on every keystroke, from the first letter, and shows each answer as
 * it arrives, so the list keeps updating while the person types.
 * Tickets: docs/tickets/location-search/issues/23-search-as-you-type.md,
 *          docs/tickets/location-search/issues/24-search-every-keystroke.md
 */
class SearchBox extends Component<SearchBoxProps, SearchBoxState> {
    /** Each search takes the next number. */
    private latestSearch = 0;
    /** Answers to searches numbered up to here are dropped: either a newer answer is already shown,
     * or the person has since cleared the text, pressed Escape or picked a result. Answers can arrive
     * out of order; this keeps an older one from replacing a newer one. */
    private shownSearch = 0;

    constructor(props) {
        super(props);
        this.state = {
            q: '',
            results: [],
            searched: false,
            error: null,
            //track the state of the search box i.e. collapsed or expanded. Default to true
            collapsedSearch: true,
            //is this a small screen device? if not we will disable collapse option
            smallScreen: false
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.clearResults = this.clearResults.bind(this);
        this.clearQuery = this.clearQuery.bind(this);
        this.selectResult = this.selectResult.bind(this);
        this.expandSearch = this.expandSearch.bind(this);
        this.onResize= this.onResize.bind(this);
    }

    // Update search term
    handleChange(e) {
        const targetValue = e.target.value;

        this.setState({
            q: targetValue
        });

        // The current results stay up until the answer for the new text replaces them, so the list
        // does not flicker on every keystroke.
        if (targetValue.trim() === '') {
            this.clearResults();
        } else {
            this.search(targetValue);
        }
    }

    // Ignore the answers of searches already sent
    ignoreAnswersInFlight(): void {
        this.shownSearch = this.latestSearch;
    }

    // Exit the search on ESC: clear the query and results, and drop focus
    handleKeyPress(e){
        if(e.key === 'Escape') {
            this.clearQuery();
            this.clearResults();
            if (e.target && typeof e.target.blur === 'function') {
                e.target.blur();
            }
        }
    }

    clearResults(){
        this.ignoreAnswersInFlight();
        this.setState({
            results: [],
            searched: false,
            error: null
        });
        // Clear map pins and any active hover emphasis
        this.props.onResults([]);
        this.props.onResultHover(null);
    }

    clearQuery(){
        this.setState({
            q: ''
        });
    }

    // The user picked a result: fly there and hide the list (map clears its own pins)
    selectResult(result: SearchResult){
        this.ignoreAnswersInFlight();
        this.props.onResultSelect(result);
        this.setState({
            results: [],
            searched: false
        });
    }

    expandSearch(e){
        this.setState(state => ({
            collapsedSearch: !state.collapsedSearch
        }));
    }

    // Search or Enter: search the current text
    handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
        e.preventDefault();
        this.search(this.state.q);
    }

    // Query search endpoint
    search(text: string): void {
        const q = text.trim();
        if (q === '') {
            return;
        }
        const searchId = ++this.latestSearch;
        // A failure message described the old text; drop it rather than leave it up while typing
        if (this.state.error) {
            this.setState({ error: null, searched: false });
        }

        apiGet(`/api/search?q=${encodeURIComponent(q)}`)
        .then((data) => {
            if (!(data && data.results)) {
                throw new Error(data?.error ?? 'Unexpected search response');
            }
            return data.results as SearchResult[];
        })
        // Separate handlers, so an error while showing the answer is not mistaken for a failed search
        .then(
            (results) => this.showAnswer(searchId, results),
            (err) => this.showFailure(searchId, err)
        );
    }

    showAnswer(searchId: number, results: SearchResult[]): void {
        if (searchId <= this.shownSearch) {
            return;
        }
        this.shownSearch = searchId;
        this.setState({
            results: results,
            searched: true,
            error: null
        });
        this.props.onResults(results);
    }

    // Only the latest search's failure is shown: while a newer search is on its way, the list stays
    showFailure(searchId: number, err: Error): void {
        if (searchId !== this.latestSearch || searchId <= this.shownSearch) {
            return;
        }
        this.shownSearch = searchId;
        console.error('Search failed', err);

        this.setState({
            results: [],
            searched: true,
            error: 'Search is unavailable right now. Please try again.'
        });
        this.props.onResults([]);
    }

    componentDidMount() {
        window.addEventListener('resize', this.onResize);
        if (window && window.innerHeight) {
            // if we're in the browser, pass in as though from event to initialise
            this.onResize({target: window});
        }
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onResize);
        this.ignoreAnswersInFlight();
    }

    // On a real mobile device onResize() gets called when the virtual keyboard pops up (e.g. when entering search text)
    // so be careful what states are changed in this method (i.e. don't collapse the search box here)
    onResize(e) {
        this.setState({smallScreen: (e.target.innerWidth < 990)});
    }

    renderResultsList() {
        if(!this.state.searched) return null;

        if(this.state.error) {
            return (
                <div className="search-results-list search-results-empty" role="alert">
                    {this.state.error}
                </div>
            );
        }

        if(this.state.results.length === 0) {
            return (
                <div className="search-results-list search-results-empty">
                    No matches found
                </div>
            );
        }

        return (
            <ul className="search-results-list">
                {
                    this.state.results.map(result => (
                        <li
                            key={result.id}
                            className="search-result"
                            onMouseEnter={() => this.props.onResultHover(result.id)}
                            onMouseLeave={() => this.props.onResultHover(null)}
                            onClick={() => this.selectResult(result)}
                        >
                            <span className="search-result-label">{result.attributes.label}</span>
                            <span className="search-result-class">{result.attributes.search_class}</span>
                        </li>
                    ))
                }
                <li className="search-results-attribution">
                    Place names © <a href="https://www.geonames.org" target="_blank" rel="noopener noreferrer">GeoNames</a> (CC BY 4.0)
                </li>
            </ul>
        );
    }

    render() {
        // if the current state is collapsed (and a mobile device) just render the icon
        if(this.state.collapsedSearch && this.state.smallScreen){
            return(
                <div className="search-box">
                    <div className="search-box-pane">
                        <div className="collapse-btn active" onClick={this.expandSearch}>
                            <SearchIcon />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="search-box" onKeyDown={this.handleKeyPress}>
                <div className="search-box-pane">
                    <div className={`collapse-btn ${this.state.smallScreen ? 'active' : ''}`} onClick={this.state.smallScreen ? this.expandSearch : undefined}>
                        <SearchIcon/>
                    </div>
                    <form onSubmit={this.handleSubmit} className="form-inline d-flex flex-nowrap">
                        <input
                            className="form-control"
                            type="search"
                            id="search-box-q"
                            name="q"
                            value={this.state.q}
                            placeholder="Search location"
                            aria-describedby="search-box-hint"
                            aria-label="Search place, building name, street name or GPS address"
                            onChange={this.handleChange}
                            maxLength={28}
                        />
                        <button className="search-btn btn btn-outline-dark" type="submit">
                            Search
                        </button>
                    </form>
                </div>
                <span id="search-box-hint" role="tooltip" className={`search-tooltip ${this.state.q ? 'has-query' : ''}`}>
                    Search place, building name, street name or GPS address
                </span>
                { this.renderResultsList() }
            </div>
        );
    }
}

export default SearchBox;
