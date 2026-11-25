import React, { FunctionComponent } from 'react';
import { Link } from 'react-router-dom';

import { dateReviver } from '../../helpers';
import { apiGet } from '../apiHelpers';


interface ExtractViewModel {
    extract_id: number;
    extracted_on: Date;
    download_path: string;
}

interface DataExtractsState {
    extracts: ExtractViewModel[] | undefined;
    latestExtract: ExtractViewModel | undefined;
    previousExtracts: ExtractViewModel[] | undefined;
    loadFailed: boolean;
}

export default class DataExtracts extends React.Component<{}, DataExtractsState> {
    constructor(props) {
        super(props);

        this.state = {
            extracts: undefined,
            latestExtract: undefined,
            previousExtracts: undefined,
            loadFailed: false
        };
    }

    async componentDidMount() {
        let extracts: ExtractViewModel[] | undefined;
        try {
            const data = await apiGet('/api/extracts', { jsonReviver: dateReviver});
            extracts = data.extracts;
        } catch {
            console.error('Connection problem. Please try again later...');
        }

        // No list (the request failed, or the API sent an error or no `extracts`) is a failure.
        if (!Array.isArray(extracts)) {
            this.setState({ loadFailed: true });
            return;
        }

        this.setState({ extracts: extracts, latestExtract: extracts[0], previousExtracts: extracts.slice(1) });
    }

    renderStatus() {
        if (this.state.loadFailed) {
            return <p>Extracts could not be loaded. Please try again later.</p>;
        }
        if (this.state.extracts == undefined) {
            return <p>Loading extracts...</p>;
        }
        if (this.state.extracts.length === 0) {
            return <p>No extracts available</p>;
        }
        return null;
    }

    render() {

        return (
            <article>
                <section className="main-col">
                    <h1 className="h2">Open data extracts</h1>
                    <p>
                    Choose one of the links below to download an archive containing the open data collected on the Colouring Cities platform
                    </p>
                    <p>
                    Colouring Cities contributions are open data, licensed under the <a href="http://opendatacommons.org/licenses/odbl/">Open Data Commons Open Database License</a> (ODbL) by Colouring Cities contributors.
                    </p>
                    <p>
                    You are free to copy, distribute, transmit and adapt our data, as long as you credit Colouring Cities and our contributors. If you alter or build upon our data, you may distribute the result only under the same licence.
                    </p>
                    <p>
                    Place and town names used for map search are derived from the <a href="https://www.geonames.org" target="_blank" rel="noopener noreferrer">GeoNames geographical database</a>, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.
                    </p>
                    <p>
                    Choose one of the links below to download an archive containing the open data collected on the Colouring Cities platform.
                    </p>
                    <p>
                    By downloading data extracts from this site, you agree to the <Link to="/data-accuracy.html">data accuracy agreement</Link>.
                    </p>
                    <p>
                    Please note that certain datasets including building footprint geometries are not currently included as we are still undertaking assessment of these. Improvements to the download section will be made over the next six months.
                    </p>

                    {this.renderStatus()}
                    {
                        this.state.latestExtract != undefined ?
                            <div>
                                <h1 className="h3">Latest extract</h1>
                                <ExtractDownloadLink {...this.state.latestExtract} />
                            </div> :
                            null
                    }
                    {
                        this.state.previousExtracts && this.state.previousExtracts.length > 0 ?
                            (<div>
                                <h1 className="h3">Older extracts</h1>
                                <ul>
                                {
                                    this.state.previousExtracts.map(e =>
                                        <li key={e.extract_id}>
                                            <ExtractDownloadLink {...e} />
                                        </li>
                                    )
                                }
                                </ul>
                            </div>) :
                            null
                    }

                </section>
            </article>
        );
    }
}


const ExtractDownloadLink: FunctionComponent<ExtractViewModel> = (props) => (
    <p><a href={`${process.env.SUBDIRECTORY??''}${props.download_path}`}>Extracted on {props.extracted_on.toDateString()}</a></p>
);
