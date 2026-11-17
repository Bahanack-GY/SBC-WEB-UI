import { useId, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Attachment01Icon, Cancel01Icon, Image01Icon, Pdf01Icon } from '@hugeicons/core-free-icons';
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENTS, checkAttachment, formatSize } from './support';

/**
 * Photos and PDFs to join to a request. Each file is checked here (type, 10 MB)
 * before anything is sent; the server checks again.
 */
export default function AttachmentPicker({ files, onChange, disabled }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const inputId = useId();
    const [errors, setErrors] = useState<string[]>([]);

    const add = (list: FileList | null) => {
        if (!list) return;
        const next = [...files];
        const problems: string[] = [];
        for (const f of Array.from(list)) {
            const why = checkAttachment(f);
            if (why) problems.push(why);
            else if (next.length >= MAX_ATTACHMENTS) problems.push(`${MAX_ATTACHMENTS} fichiers au maximum par message.`);
            else next.push(f);
        }
        setErrors([...new Set(problems)]);
        onChange(next);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div>
            <input ref={inputRef} id={inputId} type="file" accept={ATTACHMENT_ACCEPT} multiple className="sr-only"
                disabled={disabled || files.length >= MAX_ATTACHMENTS} onChange={(e) => add(e.target.files)}
                aria-describedby={`${inputId}-hint`} />
            <label htmlFor={inputId}
                className="inline-flex items-center gap-2 h-10 px-3 rounded-pill border border-border bg-surface text-sm font-semibold text-ink cursor-pointer has-[:disabled]:opacity-50">
                <HugeiconsIcon icon={Attachment01Icon} size={18} /> Joindre une photo ou un PDF
            </label>
            <p id={`${inputId}-hint`} className="mt-1 text-xs text-ink-3">JPG, PNG, WebP, HEIC ou PDF · 10 Mo au maximum · {MAX_ATTACHMENTS} fichiers au plus</p>
            {errors.length > 0 && (
                <ul role="alert" className="mt-2 space-y-1">
                    {errors.map((e) => <li key={e} className="text-xs text-danger">{e}</li>)}
                </ul>
            )}
            {files.length > 0 && (
                <ul aria-label="Fichiers joints" className="mt-2 space-y-1">
                    {files.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-tile bg-surface-2 px-2 py-1.5 text-sm text-ink">
                            <HugeiconsIcon icon={f.type === 'application/pdf' ? Pdf01Icon : Image01Icon} size={18} className="text-ink-3 shrink-0" />
                            <span className="flex-1 min-w-0 truncate">{f.name}</span>
                            <span className="text-xs text-ink-3">{formatSize(f.size)}</span>
                            <button type="button" disabled={disabled} onClick={() => onChange(files.filter((_, j) => j !== i))}
                                aria-label={`Retirer ${f.name}`} className="size-7 grid place-items-center rounded-pill text-ink-3 hover:bg-surface">
                                <HugeiconsIcon icon={Cancel01Icon} size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
