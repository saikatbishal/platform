/**
 * The form primitives: the uppercase label, a text/date/time input, a native
 * select, and the note that stands in for a control that cannot exist yet.
 *
 * @startingPoint section="Forms" subtitle="Label, input, select and the waiting note" viewport="700x340"
 */
export interface FieldLabelProps { children?: React.ReactNode; htmlFor?: string; optional?: boolean }
export interface TextFieldProps {
  label?: string;
  optional?: boolean;
  /** 'text' | 'date' | 'time' — the three the app uses. */
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  /** Upper bound for a date input. The schema refuses a future date, so the input does too. */
  max?: string;
  id?: string;
}
export interface SelectFieldProps {
  label?: string;
  optional?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  options?: Array<{ value: string; label: string }>;
  id?: string;
}
export interface FieldNoteProps {
  children?: React.ReactNode;
  /** Dashed border when the note is waiting on the user; solid when it states a fact. */
  waiting?: boolean;
}
export declare function FieldLabel(props: FieldLabelProps): JSX.Element;
export declare function TextField(props: TextFieldProps): JSX.Element;
export declare function SelectField(props: SelectFieldProps): JSX.Element;
export declare function FieldNote(props: FieldNoteProps): JSX.Element;
