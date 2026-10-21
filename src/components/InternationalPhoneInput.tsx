import React, { useState, useEffect } from 'react';
import { Phone, ChevronDown } from 'lucide-react';

export interface CountryDDI {
  code: string;
  country: string;
  flag: string;
  placeholder: string;
}

export const POPULAR_COUNTRIES: CountryDDI[] = [
  { code: '+55', country: 'Brasil', flag: '🇧🇷', placeholder: '(11) 99999-9999' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹', placeholder: '912 345 678' },
  { code: '+1', country: 'Estados Unidos / Canadá', flag: '🇺🇸', placeholder: '(555) 123-4567' },
  { code: '+244', country: 'Angola', flag: '🇦🇴', placeholder: '923 456 789' },
  { code: '+258', country: 'Moçambique', flag: '🇲🇿', placeholder: '84 123 4567' },
  { code: '+238', country: 'Cabo Verde', flag: '🇨🇻', placeholder: '991 2345' },
  { code: '+239', country: 'São Tomé e Príncipe', flag: '🇸🇹', placeholder: '991 2345' },
  { code: '+245', country: 'Guiné-Bissau', flag: '🇬🇼', placeholder: '955 123 456' },
  { code: '+34', country: 'Espanha', flag: '🇪🇸', placeholder: '612 34 56 78' },
  { code: '+33', country: 'França', flag: '🇫🇷', placeholder: '06 12 34 56 78' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧', placeholder: '7911 123456' },
  { code: '+49', country: 'Alemanha', flag: '🇩🇪', placeholder: '151 12345678' },
  { code: '+39', country: 'Itália', flag: '🇮🇹', placeholder: '312 345 6789' },
  { code: '+41', country: 'Suíça', flag: '🇨🇭', placeholder: '78 123 45 67' },
  { code: '+81', country: 'Japão', flag: '🇯🇵', placeholder: '90 1234 5678' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷', placeholder: '9 11 1234-5678' },
  { code: '+595', country: 'Paraguai', flag: '🇵🇾', placeholder: '981 123456' },
  { code: '+598', country: 'Uruguai', flag: '🇺🇾', placeholder: '99 123 456' },
  { code: '+56', country: 'Chile', flag: '🇨🇱', placeholder: '9 1234 5678' },
  { code: '+52', country: 'México', flag: '🇲🇽', placeholder: '55 1234 5678' },
  { code: '+57', country: 'Colômbia', flag: '🇨🇴', placeholder: '300 123 4567' },
  { code: '+', country: 'Outro (DDI Livre)', flag: '🌐', placeholder: '+XX XXXXXXXXX' },
];

interface InternationalPhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  label?: string;
  required?: boolean;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value,
  onChange,
  label = 'WhatsApp para Contato / Envio',
  required = false,
}) => {
  const [selectedDDI, setSelectedDDI] = useState<string>('+55');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  // Sincronizar valor recebido inicial ou externo
  useEffect(() => {
    if (!value) {
      setPhoneNumber('');
      return;
    }

    // Se já vem com DDI internacional (+XX...)
    const matched = POPULAR_COUNTRIES.find(
      (c) => c.code !== '+' && value.startsWith(c.code)
    );

    if (matched) {
      setSelectedDDI(matched.code);
      setPhoneNumber(value.slice(matched.code.length).trim());
    } else if (value.startsWith('+')) {
      setSelectedDDI('+');
      setPhoneNumber(value);
    } else {
      setPhoneNumber(value);
    }
  }, []);

  const handleDDIChange = (newDDI: string) => {
    setSelectedDDI(newDDI);
    const cleanNum = phoneNumber.replace(/^[+]/, '').trim();
    if (newDDI === '+') {
      onChange(cleanNum ? `+${cleanNum}` : '');
    } else {
      onChange(cleanNum ? `${newDDI}${cleanNum}` : '');
    }
  };

  const handleNumberChange = (rawText: string) => {
    setPhoneNumber(rawText);

    // Se o usuário digitou diretamente com '+' no input, tenta detectar o DDI
    if (rawText.startsWith('+')) {
      onChange(rawText.trim());
      return;
    }

    // Apenas números
    const clean = rawText.replace(/\D/g, '');
    if (!clean) {
      onChange('');
      return;
    }

    if (selectedDDI === '+') {
      onChange(`+${clean}`);
    } else {
      onChange(`${selectedDDI}${clean}`);
    }
  };

  const currentCountry = POPULAR_COUNTRIES.find((c) => c.code === selectedDDI) || POPULAR_COUNTRIES[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-slate-300 uppercase">
          {label}
        </label>
        <span className="text-[10px] text-cyan-400 font-mono">
          Suporta qualquer país (DDI)
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Seletor de País / DDI */}
        <div className="relative shrink-0">
          <select
            value={selectedDDI}
            onChange={(e) => handleDDIChange(e.target.value)}
            className="appearance-none bg-[#0A0F1D] border border-white/10 rounded-xl pl-2.5 pr-7 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer font-mono"
            title="Selecione o país do WhatsApp"
          >
            {POPULAR_COUNTRIES.map((c) => (
              <option key={c.code + c.country} value={c.code} className="bg-[#11192C] text-white">
                {c.flag} {c.code} ({c.country})
              </option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Campo de Telefone */}
        <div className="relative flex-1">
          <input
            type="text"
            required={required}
            value={phoneNumber}
            onChange={(e) => handleNumberChange(e.target.value)}
            placeholder={currentCountry.placeholder}
            className="w-full bg-[#0A0F1D] border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
          />
          <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>
      <p className="mt-1 text-[10px] text-slate-500">
        Link direto do WhatsApp será formatado para envio internacional sem travas.
      </p>
    </div>
  );
};
