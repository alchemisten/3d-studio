export interface CodeParams {
  alcmLogo?: boolean;
  allowZoom?: boolean;
  height: string;
  iframe: boolean;
  language: string;
  togglePlay?: boolean;
  transparent?: boolean;
  width: string;

  [key: string]: string | boolean | undefined;
}

export interface LegacyConfig {
  color: string;
  key: string;
  logo: string;
  name: string;
  projects: LegacyProject[];
}

export interface LegacyProject {
  changeDate: number;
  description: string;
  image: string;
  key: string;
  languages: string[];
  name: string;
  version: number;
}
