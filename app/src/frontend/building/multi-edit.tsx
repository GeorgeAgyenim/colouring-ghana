import React from 'react';
import { Link } from 'react-router-dom';

import { useMultiEditData } from '../hooks/use-multi-edit-data';
import ErrorBox from '../components/error-box';
import InfoBox from '../components/info-box';
import { allFieldsConfig } from '../config/data-fields-config';

import DataEntry from './data-components/data-entry';

/**
 * What happened to the building the person last clicked:
 * - updated: the values were saved
 * - unchanged: the building already had the values
 * - refused: the API would not save them; `reason` is the API's message
 * - failed: the request did not get an answer
 */
export interface PasteResult {
    status: 'updated' | 'unchanged' | 'refused' | 'failed';
    reason?: string;
}

interface MultiEditProps {
    category: string;
    /** Result of the latest click on the map; undefined before the first click and while one is being saved */
    pasteResult?: PasteResult;
}

const pasteInfoMessages = {
    updated: 'Building updated.',
    unchanged: 'That building already has these values.'
};

function pasteErrorMessage(result: PasteResult): string {
    const reason = result.status === 'failed' ?
        'could not reach the server. Check your connection and click the building again.' :
        result.reason;
    return `The building you clicked was not changed: ${reason}`;
}

const MultiEdit: React.FC<MultiEditProps> = (props) => {
    const [data, error] = useMultiEditData();
    const result = props.pasteResult;
    const isPasteError = result?.status === 'refused' || result?.status === 'failed';

    return (
        <section className='data-section'>
            <header className={`section-header view ${props.category} background-${props.category}`}>
                <h2 className="h2">Paste {props.category} data</h2>
            </header>
            <div className="section-body">
                <form>
                    {
                        error ?
                            <ErrorBox msg={error} /> :
                            <InfoBox msg='Click buildings one at a time to colour using the data below' />
                    }
                    {/* always present, so that a screen reader announces a message when it appears */}
                    <div role="status">
                        {
                            result && !isPasteError &&
                                <div className={`alert alert-${result.status === 'updated' ? 'success' : 'info'}`}>
                                    {pasteInfoMessages[result.status]}
                                </div>
                        }
                    </div>
                    {
                        isPasteError &&
                            <ErrorBox msg={pasteErrorMessage(result)} />
                    }
                    {
                        data &&
                        Object.keys(data).map((key => (
                            <DataEntry
                                key={key}
                                title={allFieldsConfig[key]?.title ?? `Unknown field (${key})`}
                                slug={key}
                                disabled={true}
                                value={data[key]}
                            />
                        )))
                    }
                </form>
                <form className='buttons-container'>
                    <Link to={`/view/${props.category}`} className='btn btn-secondary'>Back to view</Link>
                    <Link to={`/edit/${props.category}`} className='btn btn-secondary'>Back to edit</Link>
                </form>
            </div>
        </section>
    );
};

export default MultiEdit;
