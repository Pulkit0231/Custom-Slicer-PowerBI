import powerbi from "powerbi-visuals-api";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import App, { AvailableField, AvailableValue } from "./App";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import PrimitiveValue = powerbi.PrimitiveValue;

const FIELD_ROLES = Array.from({ length: 12 }, (_, index) => `field${index + 1}`);

function getTypeName(column: DataViewMetadataColumn): string | undefined {
    const type = column.type;
    if (!type) return undefined;
    if (type.dateTime) return "dateTime";
    if (type.numeric) return "numeric";
    if (type.integer) return "integer";
    if (type.bool) return "boolean";
    if (type.text) return "text";
    if (type.duration) return "duration";
    return "scalar";
}

function valueKey(value: PrimitiveValue | undefined): string {
    if (value == null || value === "") return "blank:";
    if (value instanceof Date) return `date:${value.getTime()}`;
    switch (typeof value) {
        case "string": return `string:${value}`;
        case "number": return `number:${Object.is(value, -0) ? "-0" : String(value)}`;
        case "boolean": return `boolean:${value}`;
        default: return `${typeof value}:${String(value)}`;
    }
}

function valueLabel(value: PrimitiveValue | undefined): string {
    if (value == null || value === "") return "(Blank)";
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === "number") return value.toLocaleString();
    return String(value);
}

function getRole(column: DataViewMetadataColumn, columnIndex: number): string | undefined {
    const role = FIELD_ROLES.find((name) => column.roles?.[name]);
    return role ?? (columnIndex < FIELD_ROLES.length ? FIELD_ROLES[columnIndex] : undefined);
}

function readFields(dataView: powerbi.DataView | undefined): AvailableField[] {
    const table = dataView?.table;
    if (!table?.columns?.length) return [];

    return table.columns.flatMap((column, columnIndex) => {
        const role = getRole(column, columnIndex);
        if (!role) return [];

        const valueIndex = columnIndex;
        const uniqueValues = new Map<string, AvailableValue>();
        for (const row of table.rows ?? []) {
            const raw = row[valueIndex] as PrimitiveValue | undefined;
            const key = valueKey(raw);
            if (!uniqueValues.has(key)) {
                uniqueValues.set(key, { key, label: valueLabel(raw), value: raw == null || raw === "" ? null : raw });
            }
        }

        const queryName = column.queryName;
        return [{
            id: `${role}:${queryName ?? columnIndex}`,
            role,
            displayName: column.displayName || role,
            queryName,
            columnName: column.displayName,
            dataType: getTypeName(column),
            identity: column.expr,
            identityExprs: column.identityExprs,
            values: [...uniqueValues.values()],
        }];
    });
}

export class Visual implements IVisual {
    private root: Root;

    constructor(options: VisualConstructorOptions) {
        this.root = createRoot(options.element);
    }

    public update(options: VisualUpdateOptions): void {
        const fields = readFields(options.dataViews?.[0]);
        this.root.render(React.createElement(App, { fields }));
    }

    public destroy(): void {
        this.root.unmount();
    }
}
