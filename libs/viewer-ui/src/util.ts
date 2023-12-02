import parse from 'html-react-parser';
import DOMPurify from 'dompurify';

export const cleanHTML = (content: string | Node | undefined): string | JSX.Element | JSX.Element[] => {
  return parse(DOMPurify.sanitize(content ?? ''));
};
