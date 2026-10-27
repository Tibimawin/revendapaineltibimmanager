import React from 'react';
import { Tenant, Reseller } from '../types';
import { AsaasRechargeModal } from './AsaasRechargeModal';

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  reseller: Reseller;
  onCreditsAdded?: (newBalance: number) => void;
}

export const PixModal: React.FC<PixModalProps> = ({
  isOpen,
  onClose,
  tenant,
  reseller,
  onCreditsAdded,
}) => {
  return (
    <AsaasRechargeModal
      isOpen={isOpen}
      onClose={onClose}
      tenant={tenant}
      reseller={reseller}
      onCreditsAdded={onCreditsAdded}
    />
  );
};

