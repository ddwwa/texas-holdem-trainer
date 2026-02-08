import { useState } from 'react';
import { GTOSolution, ActionComparison } from '../../gto-engine/GTOEngine';
import '../styles/GTOPanel.css';

interface GTOPanelProps {
  visible: boolean;
  gtoSolution?: GTOSolution | null;
  comparison?: ActionComparison | null;
}

function GTOPanel({ visible, gtoSolution, comparison }: GTOPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!visible) return null;

  const hasData = gtoSolution !== null && gtoSolution !== undefined;

  return (
    <>
      <button 
        className="gto-toggle-button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={isExpanded ? "Hide GTO Analysis" : "Show GTO Analysis"}
      >
        {isExpanded ? '' : ''} GTO Analysis
      </button>

      {isExpanded && (
        <div className="gto-panel">
          <div className="gto-header">
            <h3>GTO Analysis</h3>
            {hasData && comparison && (
              <span className={comparison.isOptimal ? 'gto-badge optimal' : 'gto-badge suboptimal'}>
                {comparison.isOptimal ? ' Optimal' : ' Suboptimal'}
              </span>
            )}
          </div>
          
          <div className="gto-content">
            {!hasData ? (
              <div className="gto-placeholder">
                <p>Make a decision to see GTO analysis</p>
              </div>
            ) : (
              <>
                <div className="gto-section">
                  <h4>Recommended Action</h4>
                  <div className="recommended-action">
                    {gtoSolution.recommendedAction}
                  </div>
                  {comparison && (
                    <div className={comparison.isOptimal ? 'action-feedback positive' : 'action-feedback negative'}>
                      {comparison.feedback}
                    </div>
                  )}
                </div>

                <div className="gto-section">
                  <h4>Action Frequencies</h4>
                  <div className="frequency-bars">
                    {Array.from(gtoSolution.actionFrequencies.entries()).map(([actionType, frequency]) => {
                      const widthPercent = frequency * 100;
                      return (
                        <div key={actionType} className="frequency-item">
                          <span className="frequency-label">{actionType}</span>
                          <div className="frequency-bar">
                            <div 
                              className="frequency-fill" 
                              style={{ width: widthPercent + '%' }}
                            ></div>
                          </div>
                          <span className="frequency-value">{widthPercent.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="gto-section">
                  <h4>Strategic Explanation</h4>
                  <div className="gto-explanation">
                    {gtoSolution.reasoning.map((reason, index) => (
                      <p key={index} style={{ margin: '0.5rem 0' }}>{reason}</p>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default GTOPanel;
