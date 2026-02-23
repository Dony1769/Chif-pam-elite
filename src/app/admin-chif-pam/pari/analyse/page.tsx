export default function AnalysePage() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Générateur Automatique de Matchs</h1>

      <p>
        Cette page affichera les 10 matchs générés automatiquement
        chaque matin par le moteur statistique.
      </p>

      <p>
        Les probabilités sont calculées via :
      </p>

      <ul>
        <li>Modèle Poisson</li>
        <li>Forme pondérée</li>
        <li>Avantage domicile dynamique</li>
        <li>Score mental</li>
      </ul>

      <p>Statut : Moteur en préparation</p>
    </div>
  );
}
