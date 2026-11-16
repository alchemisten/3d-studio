export class CopyTextError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CopyTextError';
  }
}

/**
 * App web views serve pages from file urls, where the clipboard api is usually
 * missing; a selected text field still copies there.
 */
export const copyText = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      throw new CopyTextError('The clipboard api refused to copy the text', { cause: error });
    }
    return;
  }

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.focus();
  field.select();
  field.setSelectionRange(0, text.length);
  const copied = document.execCommand('copy');
  field.remove();

  if (!copied) {
    throw new CopyTextError('Neither the clipboard api nor execCommand could copy the text');
  }
};
