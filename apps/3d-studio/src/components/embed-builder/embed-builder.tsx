import { FC, useMemo, useState } from 'react';
import type { CodeParams, LegacyProject } from '../../types';
import styles from './embed-builder.module.scss';
import { useConfigContext } from '../../provider';
import { SettingsButton } from '../settings-button/settings-button';

export interface EmbedBuilderProps {
  open: boolean;
  selectedProject?: LegacyProject;
}

const codeMap = {
  alcmLogo: 'l',
  allowZoom: 's',
  language: 'lng',
  togglePlay: 'e',
  transparent: 't',
};

export const EmbedBuilder: FC<EmbedBuilderProps> = ({ open, selectedProject }) => {
  const { baseUrl } = useConfigContext();
  const [codeParams, setCodeParams] = useState<CodeParams>({
    alcmLogo: false,
    height: '450px',
    iframe: true,
    language: 'none',
    togglePlay: true,
    width: '750px',
  });

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    alert('Code wurde in die Zwischenablage kopiert.');
  };

  const onCodeParamChanged = (key: keyof CodeParams, value?: string | boolean) => {
    setCodeParams((prev) => ({ ...prev, [key]: value }));
  };

  const code = useMemo(() => {
    if (!selectedProject) {
      return '';
    }
    const projectUrl = `${baseUrl}/view/${selectedProject.key}`;
    const codes = Object.entries(codeMap).reduce((acc, [key, value]) => {
      if (codeParams[key] !== undefined && codeParams[key] !== 'none') {
        acc.push(`${value}=${codeParams[key]}`);
      }
      return acc;
    }, [] as string[]);
    const url = `${projectUrl}${codes.length > 0 ? `?${codes.join('&')}` : ''}`;
    const styleSettings =
      codeParams.height || codeParams.width
        ? `style="${codeParams.height ? `height: ${codeParams.height};` : ''} ${
            codeParams.width ? `width: ${codeParams.width};` : ''
          }"`
        : '';

    return codeParams.iframe ? `<iframe src="${url}" ${styleSettings} allowfullscreen></iframe>` : url;
  }, [baseUrl, codeParams, selectedProject]);

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
      <h2 className={styles.headline}>Code</h2>
      <p>Konfigurieren und Kopieren Sie diesen Code, um Ihre Produkt per iFrame einzubetten oder zu verlinken.</p>
      <div className={styles.codeWindow}>
        <pre className={styles.code}>{code}</pre>
        <button type="button" className={styles.copyButton} onClick={copyCode}>
          Kopieren
        </button>
      </div>

      <h3 className={styles.subheadline}>Optionen</h3>
      <div className="form-group">
        <label>iFrame Einbettung</label>
        <SettingsButton setValue={(value) => onCodeParamChanged('iframe', value)} setting={codeParams.iframe} />
      </div>
      <div className="form-group">
        <label htmlFor="width">Breite</label>
        <input
          type="text"
          id="width"
          value={codeParams.width}
          onChange={(e) => onCodeParamChanged('width', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="height">Höhe</label>
        <input
          type="text"
          id="height"
          value={codeParams.height}
          onChange={(e) => onCodeParamChanged('height', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Vorgeschalteter Play Button</label>
        <SettingsButton
          canBeUndefined
          setValue={(value) => onCodeParamChanged('togglePlay', value)}
          setting={codeParams.togglePlay}
        />
      </div>
      <div className="form-group">
        <label>Alchemisten Logo</label>
        <SettingsButton
          canBeUndefined
          setValue={(value) => onCodeParamChanged('alcmLogo', value)}
          setting={codeParams.alcmLogo}
        />
      </div>
      <div className="form-group">
        <label>Zoomen aktiv</label>
        <SettingsButton
          canBeUndefined
          setValue={(value) => onCodeParamChanged('allowZoom', value)}
          setting={codeParams.allowZoom}
        />
      </div>
      <div className="form-group">
        <label>Transparenter Hintergrund</label>
        <SettingsButton
          canBeUndefined
          setValue={(value) => onCodeParamChanged('transparent', value)}
          setting={codeParams.transparent}
        />
      </div>
      <div className="form-group">
        <label htmlFor="language">Sprache</label>
        <select
          id="language"
          value={codeParams.language}
          onChange={(e) => onCodeParamChanged('language', e.target.value)}
        >
          <option value="none">Keine</option>
          <option value="de">Deutsch</option>
          <option value="en">Englisch</option>
        </select>
      </div>
    </aside>
  );
};
