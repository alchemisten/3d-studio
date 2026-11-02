export interface SceneLoadingProps {
  name?: string;
  description?: string;
  thumbnail?: string;
}

export const SceneLoading = ({ name, description, thumbnail }: SceneLoadingProps) => (
  <div className="ds-scene-loading" role="status" aria-live="polite">
    {thumbnail && <img className="ds-scene-loading__backdrop" src={thumbnail} alt="" />}
    <div className="ds-scene-loading__caption">
      <h2>{name || 'Loading scene'}</h2>
      {description && <p>{description}</p>}
      <div className="ds-scene-loading__track" role="progressbar" aria-label="Loading scene" />
    </div>
  </div>
);
