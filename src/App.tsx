import React, { useEffect, useRef, useState } from "react";
// @ts-ignore - The bundler resolves this stylesheet even without a CSS module declaration.
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

interface FilterRow {
    id: number;
    fieldId?: string;
    values: AvailableValue[];
}

interface AppProps {
    fields: AvailableField[];
}

interface DropdownOption {
    key: string;
    label: string;
}

interface DropdownProps {
    options: DropdownOption[];
    selected: string[];
    placeholder: string;
    multiple?: boolean;
    disabled?: boolean;
    onChange: (keys: string[]) => void;
}

const MAX_FILTERS = 12;
const createEmptyRows = (): FilterRow[] =>
    Array.from({ length: 4 }, (_, index) => ({ id: index + 1, values: [] }));

function Dropdown({
    options,
    selected,
    placeholder,
    multiple = false,
    disabled = false,
    onChange,
}: DropdownProps) {
    const [open, setOpen] = useState(false);
    const selectedLabels = selected.map((key) => options.find((option) => option.key === key)?.label).filter(Boolean) as string[];
    const label = selectedLabels.length === 0
        ? placeholder
        : selectedLabels.length === 1
            ? selectedLabels[0]
            : `${selectedLabels.length} selected`;

    function choose(key: string) {
        if (!multiple) {
            onChange([key]);
            setOpen(false);
            return;
        }

        onChange(selected.includes(key)
            ? selected.filter((item) => item !== key)
            : [...selected, key]);
    }

    return (
        <div className="dropdown">
            <button
                type="button"
                className="dropdown-trigger"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                disabled={disabled}
            >
                <span className="dropdown-label">{label}</span>
                <span className={`chevron ${open ? "rotated" : ""}`} aria-hidden="true">▾</span>
            </button>

            {open && !disabled && (
                <div className="dropdown-menu">
                    {options.length === 0 ? (
                        <span className="dropdown-empty">No values available</span>
                    ) : options.map((option) => {
                        const isSelected = selected.includes(option.key);
                        return (
                            <button
                                type="button"
                                key={option.key}
                                className={`dropdown-option ${isSelected ? "selected" : ""}`}
                                onClick={() => choose(option.key)}
                            >
                                <span className="option-check">{isSelected ? "✓" : ""}</span>
                                <span>{option.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function App({ fields }: AppProps) {
    const [filters, setFilters] = useState<FilterRow[]>(createEmptyRows);
    const [appliedFilters, setAppliedFilters] = useState<Array<{ field: AvailableField; values: AvailableValue[] }>>([]);
    const [message, setMessage] = useState("");
    const seededInitialRows = useRef(false);

    useEffect(() => {
        const fieldById = new Map(fields.map((field) => [field.id, field]));
        setFilters((current) => {
            if (fields.length > 0 && !seededInitialRows.current) {
                seededInitialRows.current = true;
                return current.map((row, index) => ({
                    ...row,
                    fieldId: fields[index]?.id,
                    values: [],
                }));
            }
            return current.map((row) => {
                const field = row.fieldId ? fieldById.get(row.fieldId) : undefined;
                if (!field) return { ...row, fieldId: undefined, values: [] };
                const validKeys = new Set(field.values.map((value) => value.key));
                return { ...row, values: row.values.filter((value) => validKeys.has(value.key)) };
            });
        });

        setAppliedFilters((current) => current.flatMap((filter) => {
            const field = fieldById.get(filter.field.id);
            if (!field) return [];
            const validKeys = new Set(field.values.map((value) => value.key));
            return [{ field, values: filter.values.filter((value) => validKeys.has(value.key)) }];
        }));
    }, [fields]);

    function updateFilter(id: number, changes: Partial<FilterRow>) {
        setFilters((current) => current.map((filter) => filter.id === id ? { ...filter, ...changes } : filter));
        setMessage("");
    }

    function addFilter() {
        if (filters.length >= MAX_FILTERS) {
            setMessage("You can add a maximum of 12 filters.");
            return;
        }
        setFilters((current) => [...current, { id: Date.now(), values: [] }]);
        setMessage("");
    }

    function removeFilter(id: number) {
        setFilters((current) => current.filter((filter) => filter.id !== id));
        setMessage("");
    }

    function changeField(id: number, keys: string[]) {
        updateFilter(id, { fieldId: keys[0] || undefined, values: [] });
    }

    function clearAll() {
        setFilters([]);
        setAppliedFilters([]);
        setMessage("All filters removed.");
    }

    function applyFilters() {
        const fieldById = new Map(fields.map((field) => [field.id, field]));
        const selected = filters.flatMap((row) => {
            const field = row.fieldId ? fieldById.get(row.fieldId) : undefined;
            return field && row.values.length > 0 ? [{ field, values: [...row.values] }] : [];
        });
        setAppliedFilters(selected);
        setMessage(selected.length === 0
            ? "No filters selected."
            : `${selected.length} filter(s) selected. Filter application is not connected yet.`);
    }

    const fieldOptions = fields.map((field) => ({ key: field.id, label: field.displayName }));
    const unassignedSlots = 12 - fields.length;

    return (
        <main className="filter-panel">
            <header className="panel-header">
                <h2>Universal Filter</h2>
                <span className="mode-badge">Multi-column</span>
            </header>

            <p className="subtitle">Select any column and filter by its values.</p>

            <section className="filter-list">
                {filters.map((filter, index) => {
                    const field = fields.find((candidate) => candidate.id === filter.fieldId);
                    const valueOptions = field?.values.map(({ key, label }) => ({ key, label })) ?? [];
                    return (
                        <article className="filter-row" key={filter.id}>
                            <div className="row-heading">
                                <label>Filter {index + 1}</label>
                                <button
                                    type="button"
                                    className="remove-button"
                                    onClick={() => removeFilter(filter.id)}
                                    aria-label={`Remove filter ${index + 1}`}
                                    title="Remove filter"
                                >×</button>
                            </div>

                            <Dropdown
                                options={fieldOptions}
                                selected={field ? [field.id] : []}
                                placeholder={fields.length ? "Choose a column..." : "Assign columns in Power BI..."}
                                disabled={fields.length === 0}
                                onChange={(keys) => changeField(filter.id, keys)}
                            />
                            <Dropdown
                                options={valueOptions}
                                selected={filter.values.map((value) => value.key)}
                                placeholder={field ? "Select..." : "Choose a column first..."}
                                multiple
                                disabled={!field}
                                onChange={(keys) => updateFilter(filter.id, {
                                    values: keys.flatMap((key) => {
                                        const value = field?.values.find((candidate) => candidate.key === key);
                                        return value ? [value] : [];
                                    }),
                                })}
                            />
                        </article>
                    );
                })}
            </section>

            <button type="button" className="add-button" onClick={addFilter} disabled={filters.length >= MAX_FILTERS}>
                <span>＋</span> Add another column filter
                <span className="count">{filters.length}/12</span>
            </button>

            <div className="action-buttons">
                <button type="button" className="apply-button" onClick={applyFilters}>Apply Filters</button>
                <button type="button" className="clear-button" onClick={clearAll}>Clear All</button>
            </div>

            {message && <p className="status-message" role="status">{message}</p>}
            {!fields.length ? (
                <p className="footer-note">Assign one or more columns to the Field 1–Field 12 wells in the Format pane.</p>
            ) : (
                <p className="footer-note">{fields.length} column(s) available. Values come from the current Power BI data view; at most 30,000 rows are supplied.</p>
            )}
            {fields.length > 0 && unassignedSlots > 0 && (
                <p className="footer-note">{unassignedSlots} field slot(s) are empty. Add columns in the Format pane to make them available here.</p>
            )}

            {appliedFilters.length > 0 && (
                <details className="debug-panel">
                    <summary>View selected values</summary>
                    {appliedFilters.map((filter, index) => (
                        <p key={`${filter.field.id}-${index}`}>
                            <strong>{filter.field.displayName}:</strong>{" "}
                            {filter.values.map((value) => value.label).join(", ")}
                        </p>
                    ))}
                </details>
            )}
        </main>
    );
}
