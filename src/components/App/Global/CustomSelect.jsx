import { useEffect, useMemo, useRef, useState } from "react"
import "../../../styles/Global/CustomSelect.css"

export default function CustomSelect({
  value,
  onChange,
  options = [],
  name,
  placeholder = "Selecione",
  className = "",
  disabled = false
}) {
  const [open, setOpen] = useState(false)
  const selectRef = useRef(null)

  const normalizedOptions = useMemo(() => {
    return options.map(option => (
      typeof option === "string"
        ? { value: option, label: option }
        : option
    ))
  }, [options])

  const selectedOption = normalizedOptions.find(option => option.value === value)
  const menuOptions = normalizedOptions.filter(option => option.value !== value && option.value !== "")

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!selectRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const selectOption = (nextValue) => {
    if (name) {
      onChange?.({ target: { name, value: nextValue } })
    } else {
      onChange?.(nextValue)
    }
    setOpen(false)
  }

  return (
    <div ref={selectRef} className={`custom-select ${className} ${open ? "open" : ""} ${disabled ? "disabled" : ""}`}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setOpen(prev => !prev)}
        disabled={disabled}
      >
        <span className={`custom-select-value ${selectedOption ? "" : "placeholder"}`}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="material-symbols-outlined custom-select-chevron">expand_more</span>
      </button>

      {open && (
        <div className="custom-select-menu">
          {menuOptions.map(option => (
            <button
              type="button"
              key={option.value}
              className="custom-select-option"
              onClick={() => selectOption(option.value)}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
