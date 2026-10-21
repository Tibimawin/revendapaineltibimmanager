import React, { useState } from 'react';
import { Tenant, Reseller } from '../types';
import { X, QrCode, Copy, Check, MessageSquare, ShieldAlert } from 'lucide-react';

interface PixModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  reseller: Reseller;
}

export const PixModal: React.FC<PixModalProps> = ({
  isOpen,
  onClose,
  tenant,
  reseller,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedPack, setSelectedPack] = useState<number>(10);

  if (!isOpen) return null;

  const unitPrice = tenant.valorCreditoUnitario || 15.0;
  const totalPrice = (selectedPack * unitPrice).toFixed(2);
  const pixKey = tenant.chavePix || 'financeiro@streammaster.com';

  const handleCopy = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const whatsappMessage = encodeURIComponent(
    `💰 *SOLICITAÇÃO DE RECARGA DE CRÉDITOS*\n\n` +
    `Olá, *${tenant.nomeDono}*!\n` +
    `Acabei de fazer o PIX para recarga no *${tenant.nomeApp}*:\n\n` +
    `👤 *Revendedor:* ${reseller.nome} (${reseller.email})\n` +
    `⭐ *Quantidade:* ${selectedPack} Créditos\n` +
    `💵 *Valor Pago:* R$ ${totalPrice.replace('.', ',')}\n\n` +
    `Segue o comprovante em anexo para liberação do saldo!`
  );

  const whatsappLink = `https://wa.me/${tenant.whatsapp.replace(/\D/g, '')}?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#11192C] border border-white/10 rounded-2xl shadow-2xl p-6 text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <QrCode className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Comprar Créditos via PIX</h3>
              <p className="text-xs text-slate-400">
                Pagamento direto para o Dono do App: <span className="text-white font-medium">{tenant.nomeDono}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Escolha do Pacote */}
        <div className="mt-5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Selecione a quantidade de créditos:
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 20, 50].map((credits) => {
              const isSelected = selectedPack === credits;
              const packPrice = (credits * unitPrice).toFixed(2);
              return (
                <button
                  key={credits}
                  type="button"
                  onClick={() => setSelectedPack(credits)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/15 text-white ring-1 ring-amber-400/50'
                      : 'border-white/10 bg-[#0A0F1D]/60 text-slate-300 hover:border-white/20'
                  }`}
                >
                  <div className="font-extrabold text-base font-mono tabular-nums">{credits} cr</div>
                  <div className="text-[11px] text-amber-300 font-mono mt-0.5">R$ {packPrice.replace('.', ',')}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumo do Pedido */}
        <div className="mt-5 p-4 rounded-xl bg-[#0A0F1D] border border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Total a pagar:</div>
            <div className="text-2xl font-black text-amber-400 font-mono tabular-nums">
              R$ {totalPrice.replace('.', ',')}
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>{selectedPack} créditos</div>
            <div className="text-[11px] text-slate-500">R$ {unitPrice.toFixed(2).replace('.', ',')} por crédito</div>
          </div>
        </div>

        {/* Chave PIX */}
        <div className="mt-5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Chave PIX do Dono do App:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={pixKey}
              className="flex-1 bg-[#0A0F1D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Informações e Envio de Comprovante */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-3">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-emerald-900/30 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Enviar Comprovante via WhatsApp</span>
          </a>

          <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-white/5 p-2.5 rounded-lg">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Após a transferência, envie o comprovante ao Dono. Os créditos serão creditados no seu saldo imediatamente após a confirmação.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
