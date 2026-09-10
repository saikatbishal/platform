Every control in the Log-a-journey sheet. Focus turns the border `--accent`; there is no focus ring on top of it.

```jsx
<TextField label="Note" optional placeholder="Overnight, top bunk." value={note} onChange={setNote} />
<TextField label="Travelled on" type="date" value={date} max={today()} onChange={setDate} />
<SelectField label="Train" optional value={train} onChange={setTrain} options={trains} />
<FieldNote waiting>Pick both stations and the trains that run between them appear here.</FieldNote>
```

Placeholders are written as a person would speak ("Overnight, top bunk."), never as `Enter a note`. A `FieldNote` is never an error — it explains what the data can and cannot do.
