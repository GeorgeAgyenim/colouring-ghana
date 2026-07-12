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
    fetching: boolean;
    collapsedSearch: boolean;
    smallScreen: boolean;
}

/**
 * Search for location
 */
class SearchBox extends Component<SearchBoxProps, SearchBoxState> {
    constructor(props) {
        super(props);
        this.state = {
            q: '',
            results: [],
            searched: false,
            fetching: false,
            //track the state of the search box i.e. collapsed or expanded. Default to true
            collapsedSearch: true,
            //is this a small screen device? if not we will disable collapse option
            smallScreen: false
        };
        this.handleChange = this.handleChange.bind(this);
        this.search = this.search.bind(this);
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

        // Clear results if the query is changed sufficiently or deleted
        if(targetValue === '' || !this.state.q.startsWith(targetValue) ) {
            this.clearResults();
        }
    }

    // Clear search results on ESC
    handleKeyPress(e){
        if(e.keyCode === 27) {
            //ESC is pressed
            this.clearQuery();
            this.clearResults();
        }
    }

    clearResults(){
        this.setState({
            results: [],
            searched: false
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

    // Query search endpoint
    search(e) {
        e.preventDefault();
        this.setState({
            fetching: true
        });

        apiGet(`/api/search?q=${encodeURIComponent(this.state.q)}`)
        .then((data) => {
            if (data && data.results){
                this.setState({
                    results: data.results,
                    searched: true,
                    fetching: false
                });
                this.props.onResults(data.results);
            } else {
                console.error(data);

                this.setState({
                    results: [],
                    searched: true,
                    fetching: false
                });
                this.props.onResults([]);
            }
        }).catch((err) => {
            console.error(err);

            this.setState({
                results: [],
                searched: true,
                fetching: false
            });
            this.props.onResults([]);
        });
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
    }

    // On a real mobile device onResize() gets called when the virtual keyboard pops up (e.g. when entering search text)
    // so be careful what states are changed in this method (i.e. don't collapse the search box here)
    onResize(e) {
        this.setState({smallScreen: (e.target.innerWidth < 990)});
    }

    renderResultsList() {
        if(!this.state.searched) return null;

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
                    <form onSubmit={this.search} className="form-inline d-flex flex-nowrap">
                        <input
                            className="form-control"
                            type="search"
                            id="search-box-q"
                            name="q"
                            value={this.state.q}
                            placeholder="Search town, street, name or GPS address..."
                            aria-label="Search town, street, name or GPS address..."
                            onChange={this.handleChange}
                            maxLength={28}
                        />
                        <button className="search-btn btn btn-outline-dark" type="submit">Search</button>
                    </form>
                </div>
                { this.renderResultsList() }
            </div>
        );
    }
}

export default SearchBox;
