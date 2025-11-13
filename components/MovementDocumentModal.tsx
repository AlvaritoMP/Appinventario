import React from 'react';
import { LogEntry } from '../types';
import { ICONS } from '../constants';

// UI Components
const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-3xl' }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode, maxWidth?: string }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
        <div className={`bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full ${maxWidth} mx-auto`} onClick={e => e.stopPropagation()}>
          <div className="p-5 border-b border-gray-700 flex justify-between items-center print:hidden">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <div className="flex items-center gap-4">
                <button onClick={() => window.print()} className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 font-semibold py-2 px-4 rounded-lg transition-colors">
                    {ICONS.print}
                    Imprimir
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">{ICONS.close}</button>
            </div>
          </div>
          <div className="p-1 bg-white max-h-[80vh] overflow-y-auto">
              {children}
          </div>
        </div>
      </div>
    );
};

const DocumentHeader = ({ title, logId }: { title: string, logId: string }) => (
    <div className="flex justify-between items-start pb-4 mb-4 border-b-2 border-gray-300">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Inventario Simple</h1>
            <p className="text-gray-500">Sistema de Gestión de Inventario</p>
        </div>
        <div className="text-right">
            <h2 className="text-2xl font-semibold text-gray-700">{title}</h2>
            <p className="text-sm text-gray-500 font-mono mt-1">
                Código Movimiento: <span className="text-gray-800 font-bold">{logId}</span>
            </p>
        </div>
    </div>
);

// FIX: Made children prop optional to resolve TypeScript errors.
const InfoSection = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <div className="mb-6">
        <h3 className="text-sm font-bold uppercase text-gray-500 border-b border-gray-300 pb-1 mb-3">{title}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-sm">
            {children}
        </div>
    </div>
);

const InfoItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-gray-500 font-semibold">{label}</p>
        <p className="text-gray-800">{value}</p>
    </div>
);

const ConstanciaContent: React.FC<{ logEntry: LogEntry }> = ({ logEntry }) => {
    return (
        <>
            <DocumentHeader title="Constancia de Movimiento" logId={logEntry.id} />
            <InfoSection title="Datos del Movimiento">
                <InfoItem label="Fecha y Hora" value={new Date(logEntry.timestamp).toLocaleString()} />
                <InfoItem label="Tipo de Movimiento" value={<span className="font-bold">{logEntry.type}</span>} />
                <InfoItem label="Usuario" value={logEntry.user} />
            </InfoSection>
            <InfoSection title="Datos del Producto">
                <InfoItem label="Producto" value={logEntry.productName} />
                <InfoItem label="SKU" value={<span className="font-mono">{logEntry.sku}</span>} />
                <InfoItem label="Cantidad Modificada" value={<span className={`font-bold ${logEntry.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>{logEntry.quantityChange > 0 ? `+${logEntry.quantityChange}` : logEntry.quantityChange}</span>} />
                 <InfoItem label="Nuevo Stock en Almacén" value={<span className="font-bold">{logEntry.newQuantityInWarehouse}</span>} />
            </InfoSection>
             <InfoSection title="Ubicación">
                <InfoItem label="Almacén" value={logEntry.warehouseName} />
            </InfoSection>
            <InfoSection title="Detalles Adicionales">
                 <div className="col-span-full">
                    <p className="text-gray-700 italic">{logEntry.details || 'Sin detalles adicionales.'}</p>
                </div>
            </InfoSection>
        </>
    );
};

const GuiaDespachoContent: React.FC<{ logEntry: LogEntry }> = ({ logEntry }) => {
    return (
        <>
            <DocumentHeader title="Guía de Despacho / Remisión" logId={logEntry.id} />
             <InfoSection title="Información del Despacho">
                <InfoItem label="Fecha de Despacho" value={new Date(logEntry.timestamp).toLocaleString()} />
                <InfoItem label="Origen (Almacén)" value={<span className="font-bold">{logEntry.warehouseName}</span>} />
                <InfoItem label="Destino" value={logEntry.details.includes('Transferencia a') ? logEntry.details.split('Transferencia a ')[1].split('.')[0] : 'Cliente / Externo'} />
                <InfoItem label="Despachado por" value={logEntry.user} />
            </InfoSection>

            <div className="mb-6">
                 <h3 className="text-sm font-bold uppercase text-gray-500 border-b border-gray-300 pb-1 mb-3">Productos Despachados</h3>
                 <table className="w-full text-sm">
                     <thead className="bg-gray-100">
                         <tr>
                             <th className="p-2 text-left font-semibold text-gray-600">SKU</th>
                             <th className="p-2 text-left font-semibold text-gray-600">Producto</th>
                             <th className="p-2 text-right font-semibold text-gray-600">Cantidad</th>
                         </tr>
                     </thead>
                     <tbody>
                         <tr className="border-b">
                             <td className="p-2 font-mono">{logEntry.sku}</td>
                             <td className="p-2">{logEntry.productName}</td>
                             <td className="p-2 text-right font-bold">{Math.abs(logEntry.quantityChange)}</td>
                         </tr>
                     </tbody>
                 </table>
            </div>
            
            <div className="mt-20">
                 <h3 className="text-sm font-bold uppercase text-gray-500 border-b border-gray-300 pb-1 mb-3">Firmas de Conformidad</h3>
                 <div className="grid grid-cols-2 gap-8 pt-8">
                     <div className="text-center">
                         <div className="border-b-2 border-gray-400 border-dotted pb-2 mb-2"></div>
                         <p className="font-semibold text-gray-800">Firma Despacho</p>
                         <p className="text-xs text-gray-600">Nombre: {logEntry.user}</p>
                         <p className="text-xs text-gray-600">ID:</p>
                     </div>
                      <div className="text-center">
                         <div className="border-b-2 border-gray-400 border-dotted pb-2 mb-2"></div>
                         <p className="font-semibold text-gray-800">Firma Recepción</p>
                         <p className="text-xs text-gray-600">Nombre:</p>
                         <p className="text-xs text-gray-600">ID:</p>
                     </div>
                 </div>
            </div>
        </>
    );
};

export const MovementDocumentModal = ({ logEntry, docType, onClose }: { logEntry: LogEntry, docType: 'CONSTANCIA' | 'GUIA_DESPACHO', onClose: () => void }) => {
    
    const title = docType === 'CONSTANCIA' ? `Constancia: ${logEntry.id}` : `Guía de Despacho: ${logEntry.id}`;

    return (
        <>
        <style>
        {`
            @media print {
                body > *:not(.print-container) {
                    display: none !important;
                }
                .print-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    padding: 0;
                    margin: 0;
                    overflow: visible !important;
                }
                .print-content {
                    color: black !important;
                    box-shadow: none !important;
                    border: none !important;
                }
            }
        `}
        </style>
        <Modal isOpen={true} onClose={onClose} title={title}>
            <div id="printable-document" className="bg-white text-gray-800 p-8 rounded-md print-content">
                {docType === 'CONSTANCIA' && <ConstanciaContent logEntry={logEntry} />}
                {docType === 'GUIA_DESPACHO' && <GuiaDespachoContent logEntry={logEntry} />}
            </div>
        </Modal>
        </>
    );
};