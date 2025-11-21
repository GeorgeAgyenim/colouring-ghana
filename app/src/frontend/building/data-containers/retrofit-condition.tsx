import React, { Fragment } from 'react';
import { dataFields } from '../../config/data-fields-config';
import NumericDataEntry from '../data-components/numeric-data-entry';
import withCopyEdit from '../data-container';
import { CategoryViewProps } from './category-view-props';
import { DataEntryGroup } from '../data-components/data-entry-group';
import { MultiDataEntry } from '../data-components/multi-data-entry/multi-data-entry';
import SelectDataEntry from '../data-components/select-data-entry';
import Verification from '../data-components/verification';

/**
* Retrofit & Condition view/edit section
*/
const RetrofitConditionView: React.FunctionComponent<CategoryViewProps> = (props) => {

    const queryParameters = new URLSearchParams(window.location.search);
    const subcat = queryParameters.get("sc");

    const currentYear = new Date().getFullYear();

    return (
        <Fragment>
            <DataEntryGroup name="Retrofit History" collapsed={subcat==null || subcat!="3"}>
                <NumericDataEntry
                    slug='age_retrofit_date'
                    title={dataFields.age_retrofit_date.title}
                    value={props.building.age_retrofit_date}
                    mode={props.mode}
                    copy={props.copy}
                    onChange={props.onChange}
                    step={1}
                    min={1}
                    max={currentYear}
                    tooltip={dataFields.age_retrofit_date.tooltip}
                    />
                <Verification
                    slug="age_retrofit_date"
                    allow_verify={props.user !== undefined && props.building.age_retrofit_date !== null && !props.edited}
                    onVerify={props.onVerify}
                    user_verified={props.user_verified.hasOwnProperty("age_retrofit_date")}
                    user_verified_as={props.user_verified.age_retrofit_date}
                    verified_count={props.building.verified.age_retrofit_date}
                    />
                <SelectDataEntry
                    title={dataFields.age_retrofit_date_source_type.title}
                    slug="age_retrofit_date_source_type"
                    value={props.building.age_retrofit_date_source_type}
                    mode={props.mode}
                    copy={props.copy}
                    onChange={props.onChange}
                    tooltip={dataFields.age_retrofit_date_source_type.tooltip}
                    options={dataFields.age_retrofit_date_source_type.items}
                    placeholder={dataFields.age_retrofit_date_source_type.example}
                    />
                {(props.building.age_retrofit_date_source_type == dataFields.age_retrofit_date_source_type.items[0] ||
                    props.building.age_retrofit_date_source_type == dataFields.age_retrofit_date_source_type.items[1] ||
                    props.building.age_retrofit_date_source_type == null) ? <></> :
                    <>
                        <MultiDataEntry
                            title={dataFields.age_retrofit_date_source_links.title}
                            slug="age_retrofit_date_source_links"
                            value={props.building.age_retrofit_date_source_links}
                            mode={props.mode}
                            copy={props.copy}
                            onChange={props.onChange}
                            tooltip={dataFields.age_retrofit_date_source_links.tooltip}
                            placeholder="https://..."
                            editableEntries={true}
                            isUrl={true}
                        />
                    </>
                }
            </DataEntryGroup>
            <DataEntryGroup name="Condition" collapsed={subcat==null || subcat!="7"}>
                <SelectDataEntry
                    title={dataFields.building_condition.title}
                    slug="building_condition"
                    value={props.building.building_condition}
                    mode={props.mode}
                    copy={props.copy}
                    onChange={props.onChange}
                    tooltip={dataFields.building_condition.tooltip}
                    options={dataFields.building_condition.items}
                    placeholder="Select condition..."
                />
                <Verification
                    slug="building_condition"
                    allow_verify={props.user !== undefined && props.building.building_condition !== null && !props.edited}
                    onVerify={props.onVerify}
                    user_verified={props.user_verified.hasOwnProperty("building_condition")}
                    user_verified_as={props.user_verified.building_condition}
                    verified_count={props.building.verified.building_condition}
                />
                <SelectDataEntry
                    title={dataFields.building_condition_source_type.title}
                    slug="building_condition_source_type"
                    value={props.building.building_condition_source_type}
                    mode={props.mode}
                    copy={props.copy}
                    onChange={props.onChange}
                    tooltip={dataFields.building_condition_source_type.tooltip}
                    options={dataFields.building_condition_source_type.items}
                    placeholder={dataFields.building_condition_source_type.example}
                />
                {(props.building.building_condition_source_type == dataFields.building_condition_source_type.items[0] ||
                    props.building.building_condition_source_type == dataFields.building_condition_source_type.items[1] ||
                    props.building.building_condition_source_type == null) ? <></> :
                    <>
                        <MultiDataEntry
                            title={dataFields.building_condition_source_links.title}
                            slug="building_condition_source_links"
                            value={props.building.building_condition_source_links}
                            mode={props.mode}
                            copy={props.copy}
                            onChange={props.onChange}
                            tooltip={dataFields.building_condition_source_links.tooltip}
                            placeholder="https://..."
                            editableEntries={true}
                            isUrl={true}
                        />
                    </>
                }
            </DataEntryGroup>
        </Fragment>
    );
};
const RetrofitConditionContainer = withCopyEdit(RetrofitConditionView);

export default RetrofitConditionContainer;
