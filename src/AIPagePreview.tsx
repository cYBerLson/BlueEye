import { useEffect, useRef } from "react";
import { BrainCircuit, X } from "lucide-react";
export default function AIPagePreview({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="ai-preview"
      aria-labelledby="ai-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="panel-heading">
        <span className="section-label">
          <BrainCircuit size={18} /> BLUEEYE AI
        </span>
        <button
          className="icon-button"
          title="Close AI preview"
          aria-label="Close AI preview"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <div className="preview-content">
        <h2 id="ai-title">Maritime Intelligence Assistant</h2>
        <p>Planned capabilities</p>
        <ul>
          <li>Investigate vessel and shipment events</li>
          <li>Explain delays and anomalies</li>
          <li>Summarize maritime evidence</li>
          <li>Generate operational recommendations</li>
          <li>Support predictive intelligence</li>
        </ul>
        <p className="preview-status">COMING IN INTELLIGENCE PHASE</p>
        <small>
          Product architecture preview. No AI service or operational
          intelligence is connected.
        </small>
      </div>
    </dialog>
  );
}
