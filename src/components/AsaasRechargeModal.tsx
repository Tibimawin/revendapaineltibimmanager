import React, { useState, useEffect, useRef } from 'react';
import { Tenant, Reseller } from '../types';
import { saasStore } from '../services/storage';
import { 
  X, 
  Coins, 
  Copy, 
  Check, 
  QrCode, 
  Sparkles, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';

interface AsaasRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant;
  reseller: Reseller;
  onCreditsAdded?: (newBalance: number) => void;
}

export const AsaasRechargeModal: React.FC<AsaasRechargeModalProps> = ({
  isOpen,
  onClose,
  tenant,
  reseller,
  onCreditsAdded,
}) => {
  const [selectedPack, setSelectedPack] = useState<number>(10);
  const [customCredits, setCustomCredits] = useState<string>('');
  const [step, setStep] = useState<'SELECT' | 'PAYMENT' | 'SUCCESS'>('SELECT');
  const [isGenerating, setIsGenerating] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    paymentId: string;
    totalAmount: number;
    credits: number;
    pixCopiaECola: string;
    pixQrCodeImage?: string | null;
    mode?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<number>(reseller.saldoCreditos);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const unitPrice = tenant.valorCreditoUnitario || 15.0;
  const currentCredits = customCredits && parseInt(customCredits) > 0 
    ? parseInt(customCredits) 
    : selectedPack;
  const totalPrice = (currentCredits * unitPrice).toFixed(2);

  // Limpar polling ao fechar
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyPix = () => {
    if (!paymentData?.pixCopiaECola) return;
    navigator.clipboard.writeText(paymentData.pixCopiaECola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGeneratePix = async () => {
    if (currentCredits <= 0) {
      setErrorMsg('A quantidade de créditos deve ser de no mínimo 1.');
      return;
    }
    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const resp = await fetch('/api/asaas/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: tenant.asaasApiKey || '',
          environment: tenant.asaasEnvironment || 'production',
          resellerName: reseller.nome,
          resellerEmail: reseller.email,
          resellerWhatsapp: reseller.whatsapp,
          credits: currentCredits,
          unitPrice,
          tenantName: tenant.nomeApp,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.message || 'Falha ao gerar cobrança no Asaas.');
      }

      setPaymentData(data);
      setStep('PAYMENT');

      // Iniciar polling a cada 3.5s para verificar se o pagamento foi confirmado
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const checkResp = await fetch('/api/asaas/check-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: tenant.asaasApiKey || '',
              environment: tenant.asaasEnvironment || 'production',
              paymentId: data.paymentId,
            }),
          });
          const checkData = await checkResp.json();
          if (checkData.confirmed) {
            handlePaymentConfirmed(currentCredits, data.paymentId);
          }
        } catch {
          // ignore polling transient network errors
        }
      }, 3500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePaymentConfirmed = async (creditsToAdd: number, payId?: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    // Adicionar créditos na conta do revendedor no saasStore e no Baserow
    const res = await saasStore.adjustResellerCredits(
      reseller.id,
      creditsToAdd,
      `Recarga automática Asaas (${creditsToAdd} créditos) · Ref: ${payId || 'Pix'}`
    );

    setNewBalance(res.novoSaldo);
    if (onCreditsAdded) {
      onCreditsAdded(res.novoSaldo);
    }
    setStep('SUCCESS');
  };

  const handleSimulatePayment = () => {
    handlePaymentConfirmed(currentCredits, paymentData?.paymentId || 'sim_manual');
  };

  const handleCloseModal = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setStep('SELECT');
    setPaymentData(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#11192C] border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-7 text-slate-100 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Recarga Automática de Créditos ({tenant.nomeApp})
              </h3>
              <p className="text-xs text-slate-400">
                Pagamento via Asaas PIX com liberação instantânea de saldo
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* ETAPA 1: ESCOLHA DE PACOTE DE CRÉDITOS */}
        {step === 'SELECT' && (
          <div className="mt-5 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Selecione a quantidade de créditos:
                </label>
                <span className="text-xs font-mono text-cyan-400">
                  R$ {unitPrice.toFixed(2).replace('.', ',')} / crédito
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[5, 10, 20, 50].map((pack) => {
                  const isSelected = selectedPack === pack && !customCredits;
                  const price = (pack * unitPrice).toFixed(2);
                  return (
                    <button
                      key={pack}
                      type="button"
                      onClick={() => {
                        setSelectedPack(pack);
                        setCustomCredits('');
                      }}
                      className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/20 text-white shadow-lg shadow-amber-500/10'
                          : 'border-white/10 bg-[#0A0F1D]/80 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <div className="text-xs text-slate-400 font-medium">Pacote</div>
                      <div className="font-extrabold text-lg sm:text-xl font-mono text-white mt-0.5">
                        {pack} cr
                      </div>
                      <div className="text-xs text-amber-400 font-mono font-bold mt-1">
                        R$ {price.replace('.', ',')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ou quantidade livre */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                Ou digite uma quantidade personalizada:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={customCredits}
                  onChange={(e) => setCustomCredits(e.target.value)}
                  placeholder="Ex: 15 créditos"
                  className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="p-4 rounded-xl bg-[#0A0F1D] border border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs text-slate-400">Total a Pagar via PIX:</span>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">
                  R$ {totalPrice.replace('.', ',')}
                </div>
              </div>
              <div className="text-left sm:text-right text-xs text-slate-400">
                <div className="font-bold text-white">{currentCredits} créditos adicionados</div>
                <div className="text-[11px] text-emerald-400 flex items-center sm:justify-end gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                  <span>Liberação automática via Asaas</span>
                </div>
              </div>
            </div>

            {/* Status Gateway Asaas */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Processamento seguro via <strong>Gateway Asaas</strong> do Dono: <span className="text-white">{tenant.nomeDono}</span>
                </span>
              </div>
              {tenant.asaasApiKey ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  API Conectada
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Modo PIX / Simulação
                </span>
              )}
            </div>

            {/* Botões */}
            <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGeneratePix}
                disabled={isGenerating || currentCredits <= 0}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando PIX...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Gerar PIX de R$ {totalPrice.replace('.', ',')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 2: PAGAMENTO PIX ASAAS & AGUARDANDO CONFIRMAÇÃO */}
        {step === 'PAYMENT' && paymentData && (
          <div className="mt-5 space-y-5 animate-fade-in">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="text-xs text-amber-200 font-semibold">
                  Aguardando confirmação do pagamento no Asaas...
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-amber-400">
                R$ {paymentData.totalAmount.toFixed(2).replace('.', ',')} ({paymentData.credits} cr)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-4 bg-[#0A0F1D] border border-white/5 rounded-2xl">
                {paymentData.pixQrCodeImage ? (
                  <img
                    src={paymentData.pixQrCodeImage}
                    alt="QR Code PIX Asaas"
                    className="w-48 h-48 rounded-xl bg-white p-2 shadow-lg"
                  />
                ) : (
                  <div className="w-48 h-48 rounded-xl bg-white p-3 flex flex-col items-center justify-center text-black text-center shadow-lg">
                    <QrCode className="w-24 h-24 text-slate-800" />
                    <span className="text-[10px] font-bold mt-2 text-slate-600">
                      PIX Asaas ({paymentData.credits} créditos)
                    </span>
                  </div>
                )}
                <span className="text-[11px] text-slate-400 mt-2">
                  Abra o app do seu banco e aponte a câmera
                </span>
              </div>

              {/* Copia e Cola */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Código PIX Copia e Cola:
                  </label>
                  <textarea
                    readOnly
                    rows={4}
                    value={paymentData.pixCopiaECola}
                    className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl p-3 text-xs font-mono text-cyan-300 focus:outline-none resize-none break-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-black" />
                      <span>Código Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Código PIX Copia e Cola</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-slate-400 text-center">
                  Assim que o banco confirmar, seus créditos serão adicionados instantaneamente na sua conta.
                </p>
              </div>
            </div>

            {/* Botão de Simulação Instantânea para Testes */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSimulatePayment}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Simula o retorno positivo do webhook do Asaas imediatamente"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simular Pagamento Confirmado (Teste Imediato)</span>
              </button>

              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: SUCESSO - CRÉDITOS ADICIONADOS */}
        {step === 'SUCCESS' && (
          <div className="mt-6 py-6 text-center space-y-4 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h4 className="text-xl font-black text-white">
                Recarga Concluída com Sucesso!
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Foram adicionados <strong className="text-amber-400">{currentCredits} créditos</strong> ao seu saldo de revendedor.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 p-3 px-5 rounded-2xl bg-[#0A0F1D] border border-white/10 font-mono">
              <span className="text-xs text-slate-400">Novo Saldo Total:</span>
              <span className="text-lg font-bold text-amber-300">{newBalance} créditos</span>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>Ir para o Painel e Ativar Clientes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
