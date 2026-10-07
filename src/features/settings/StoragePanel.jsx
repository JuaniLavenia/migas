import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { formatBytes, isNearQuota, usagePercent } from "../../lib/storageUsage";

function imagesText(images) {
  if (!images) return "Calculando…";
  if (!images.available) return "No disponibles en este navegador";
  const photos = images.count === 1 ? "1 foto" : `${images.count} fotos`;
  return `${photos} · ${formatBytes(images.size)}`;
}

function PersistenceStatus({ persisted, canPersist, onPersist }) {
  if (persisted === undefined) return null;
  if (persisted) {
    return (
      <p className="storage-note">
        <ShieldCheck size={15} /> Almacenamiento protegido: el navegador no lo
        borrará para liberar espacio.
      </p>
    );
  }
  if (persisted === null || !canPersist) {
    return (
      <p className="storage-note">
        Tu navegador no permite proteger el almacenamiento.
      </p>
    );
  }
  return (
    <div className="storage-persist">
      <p className="storage-note">
        El navegador puede borrar estos datos si se queda sin espacio.
      </p>
      <button type="button" className="secondary-button" onClick={onPersist}>
        <ShieldCheck size={15} /> Proteger almacenamiento
      </button>
    </div>
  );
}

// Storage used by the app: photos (from the image store), the whole site's
// usage against the browser quota, and whether the data is protected from
// automatic eviction. Fields are undefined while loading; `estimate` and
// `persisted` are null when the browser does not support them.
function StoragePanel({
  images,
  estimate,
  persisted,
  canPersist,
  onRefresh,
  onPersist,
}) {
  const percent = estimate ? usagePercent(estimate.usage, estimate.quota) : null;
  const usageText = estimate
    ? `${formatBytes(estimate.usage)} de ${formatBytes(estimate.quota)}`
    : null;
  return (
    <section
      className="panel storage-panel"
      aria-labelledby="storage-panel-title"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Espacio</span>
          <h2 id="storage-panel-title">Almacenamiento</h2>
        </div>
        <button type="button" className="text-button" onClick={onRefresh}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>
      <dl className="storage-facts">
        <div>
          <dt>Fotos de recetas</dt>
          <dd>{imagesText(images)}</dd>
        </div>
      </dl>
      {estimate === undefined ? null : estimate ? (
        <div className="storage-usage">
          <div className="storage-usage-label">
            <span id="storage-usage-label">Espacio usado</span>
            <strong>{usageText}</strong>
          </div>
          <meter
            role="meter"
            aria-labelledby="storage-usage-label"
            aria-valuemin={0}
            aria-valuemax={estimate.quota}
            aria-valuenow={estimate.usage}
            aria-valuetext={`${usageText} (${percent}%)`}
            min={0}
            max={estimate.quota}
            value={estimate.usage}
            low={estimate.quota * 0.5}
            high={estimate.quota * 0.8}
            optimum={0}
          />
        </div>
      ) : (
        <p className="storage-note">
          Tu navegador no informa cuánto espacio queda disponible.
        </p>
      )}
      {estimate && isNearQuota(estimate.usage, estimate.quota) && (
        <div className="recipe-warning" role="alert">
          <AlertTriangle size={16} />
          <span>
            El almacenamiento está casi lleno ({percent}%). Descargá un backup
            y quitá las fotos que no uses para liberar espacio.
          </span>
        </div>
      )}
      <PersistenceStatus
        persisted={persisted}
        canPersist={canPersist}
        onPersist={onPersist}
      />
      <p className="storage-note">
        Los backups incluyen las fotos: descargá uno de vez en cuando para no
        perderlas.
      </p>
    </section>
  );
}

export default StoragePanel;
