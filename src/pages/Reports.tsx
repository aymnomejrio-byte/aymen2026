"use client";

import React from "react";

const Reports = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Rapports & Analyses</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Bienvenue dans la section des rapports. Ici, vous pourrez bientôt visualiser des analyses détaillées
        sur la gestion de votre équipe, les présences, les congés et la paie.
      </p>
      <p className="text-gray-600 dark:text-gray-400">
        Cette section est en cours de développement. Revenez bientôt pour découvrir de puissants outils d'analyse !
      </p>
      {/* Future charts and report components will go here */}
      <div className="mt-8 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-center text-gray-500 dark:text-gray-400">
        Espace réservé pour les graphiques et les tableaux de bord des rapports.
      </div>
    </div>
  );
};

export default Reports;