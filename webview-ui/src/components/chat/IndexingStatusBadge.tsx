import React from "react";
import { Trans } from "react-i18next";
import { vscode } from "@src/utils/vscode";

interface IndexingStatusBadgeProps {
  status: string;
  message?: string;
  progress: number; // 0-100
  isVisible: boolean;
}

const IndexingStatusBadge: React.FC<IndexingStatusBadgeProps> = ({
  status,
  message,
  progress,
  isVisible,
}) => {
  if (!isVisible) {
    return null;
  }

  const handleClick = () => {
    vscode.postMessage({
      type: "navigateTo",
      view: "settings",
      section: "codeIndex",
    });
  };

  let badgeContent = null;
  let badgeColor = "";
  let pulseAnimation = false;

  if (status === "Indexing") {
    badgeContent = (
      <>
        <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse mr-2"></div>
        <Trans i18nKey="indexingBadge.indexingInProgress">
          Indexing {{ progress }}%
        </Trans>
      </>
    );
    badgeColor = "bg-yellow-500";
    pulseAnimation = true;
  } else if (status === "Error") {
    badgeContent = (
      <>
        <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
        <Trans i18nKey="indexingBadge.indexingError">Indexing Error</Trans>
        {message && <span className="ml-1">- {message}</span>}
      </>
    );
    badgeColor = "bg-red-500";
  } else {
    // Should not be visible for "Standby" or "Indexed"
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 p-2 rounded-md text-white text-xs font-medium cursor-pointer shadow-lg transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      } ${badgeColor} ${pulseAnimation ? "animate-pulse" : ""}`}
      onClick={handleClick}
      title={message || status}
    >
      <div className="flex items-center">
        {badgeContent}
      </div>
    </div>
  );
};

export default IndexingStatusBadge;
