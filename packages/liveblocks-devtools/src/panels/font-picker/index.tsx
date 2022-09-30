import { createRoot } from "react-dom/client"

const FontPicker = () => {
  return (
    <>
      <h2>Font Picker</h2>
      <p>HELLO WORLD</p>
    </>
  )
}

const root = createRoot(document.getElementById("root"))
root.render(<FontPicker />)
