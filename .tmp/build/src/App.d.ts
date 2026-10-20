import React from "react";
import "./App.css";
export interface AvailableValue {
    /** Type-prefixed key; keeps e.g. numeric 1 distinct from string "1". */
    key: string;
    label: string;
    value: unknown;
}
export interface AvailableField {
    /** Stable within a role and query identity, even if display names collide. */
    id: string;
    role: string;
    displayName: string;
    queryName?: string;
    tableName?: string;
    columnName?: string;
    dataType?: string;
    /** The Power BI expression and identity metadata needed by a later filter stage. */
    identity?: unknown;
    identityExprs?: unknown[];
    values: AvailableValue[];
}
interface AppProps {
    fields: AvailableField[];
}
export default function App({ fields }: AppProps): React.JSX.Element;
export {};
