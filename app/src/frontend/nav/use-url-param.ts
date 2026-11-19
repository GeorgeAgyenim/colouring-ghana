import { useCallback, useMemo } from 'react';
import { useHistory, useRouteMatch, generatePath } from 'react-router';

import { UrlParamTransform } from './url-param-transform';

export function useUrlParam<T>(
    param: string,
    paramTransform: UrlParamTransform<T>,
    pathPattern?: string,
    defaultParams: { [key: string]: string} = {}
): [T, (newParam: T) => void] {
    const match = useRouteMatch();
    const history = useHistory();
    
    // Read from the address while drawing, so the first drawing (on the server, and the browser's first one)
    // already has the value. docs/tickets/location-search/issues/16-server-draws-the-default-category.md
    const stringValue: string = match.params[param];
    const paramValue = useMemo<T>(
        () => stringValue ? paramTransform.fromParam(stringValue) : undefined,
        [stringValue, paramTransform]
    );

    const setUrlParam = useCallback((value: T) => {
        const newParams = Object.assign({}, defaultParams, match.params);
        newParams[param] = value == undefined ? undefined : paramTransform.toParam(value);
        
        const newPath = generatePath(pathPattern ?? match.path, newParams);
        history.push(newPath);
    }, [param, paramTransform, pathPattern, defaultParams, match.url]);

    return [paramValue, setUrlParam];
}
