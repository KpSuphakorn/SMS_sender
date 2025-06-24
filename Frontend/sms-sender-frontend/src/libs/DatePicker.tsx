import { DatePicker as MantineDatePicker, DatesRangeValue } from '@mantine/dates';
import '@mantine/dates/styles.css';

// This is a controlled component. It receives its value and how to change it via props.
interface DatePickerProps {
  value: DatesRangeValue;
  onChange: (value: DatesRangeValue) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  return (
    <MantineDatePicker
      type="range"
      value={value}
      onChange={onChange}
    />
  );
}