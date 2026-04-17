import React from 'react';
import './SignatureOverlay.css';

export default function SignatureOverlay({ 
    approval, 
    currentUser, 
    requiredApprover, 
    signatureUrl,
    top = '50%',
    left = '50%'
}) {
    // 1. Deteksi Kondisi Delegasi
    // Cek apakah ada flag isDelegated pada approval, atau jika ID user yang login
    // berbeda dengan ID approver yang sebenarnya ditugaskan.
    const isDelegated = approval?.isDelegated || (currentUser?.id !== requiredApprover?.id);

    return (
        <div 
            className="signature-overlay-container" 
            style={{ top, left }}
        >
            {isDelegated ? (
                // 2. Jika Approval via Delegasi (TRUE)
                <div className="signature-stack">
                    <img 
                        src={signatureUrl} 
                        alt={`Signature of ${currentUser?.name}`} 
                        className="signature-img" 
                    />
                    <span className="signature-delegate-text">a.n. {currentUser?.name}</span>
                </div>
            ) : (
                // 3. Jika Approval Normal (FALSE)
                <div className="signature-stack">
                    <img 
                        src={signatureUrl} 
                        alt={`Signature of ${requiredApprover?.name}`} 
                        className="signature-img" 
                    />
                </div>
            )}
        </div>
    );
}
