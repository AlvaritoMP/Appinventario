import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, CompanyInfo } from '../types';
import { useInventoryState } from '../context/InventoryContext';
import { ICONS } from '../constants';
import { generateGRE_API, GREResponse } from '../services/sunat_api';

// UI Components
const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode, maxWidth?: string }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 print-container">
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

const DocumentHeader = ({ title, logId, transactionId }: { title: string, logId: string, transactionId?: string }) => (
    <div className="flex justify-between items-start pb-4 mb-4 border-b-2 border-gray-300">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Inventario Simple</h1>
            <p className="text-gray-500">Sistema de Gestión de Inventario</p>
        </div>
        <div className="text-right">
            <h2 className="text-2xl font-semibold text-gray-700">{title}</h2>
            <p className="text-sm text-gray-500 font-mono mt-1">
                {transactionId ? 'Cód. Transacción' : 'Cód. Movimiento'}: <span className="text-gray-800 font-bold">{transactionId || logId}</span>
            </p>
        </div>
    </div>
);

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

const ProductsTable = ({ products }: { products: { sku: string, name: string, quantity: number }[] }) => (
    <div className="mb-6">
        <h3 className="text-sm font-bold uppercase text-gray-500 border-b border-gray-300 pb-1 mb-3">Productos Involucrados</h3>
        <table className="w-full text-sm">
            <thead className="bg-gray-100">
                <tr>
                    <th className="p-2 text-left font-semibold text-gray-600">SKU</th>
                    <th className="p-2 text-left font-semibold text-gray-600">Producto</th>
                    <th className="p-2 text-right font-semibold text-gray-600">Cantidad</th>
                </tr>
            </thead>
            <tbody>
                {products.map(p => (
                    <tr key={p.sku} className="border-b">
                        <td className="p-2 font-mono">{p.sku}</td>
                        <td className="p-2">{p.name}</td>
                        <td className="p-2 text-right font-bold">{Math.abs(p.quantity)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


const ConstanciaContent: React.FC<{ logEntries: LogEntry[] }> = ({ logEntries }) => {
    const mainLog = logEntries[0];
    const isBulk = logEntries.length > 1;

    const products = logEntries
        .filter(l => l.type === 'SALIDA' || !isBulk) // En bulk, solo mostramos las salidas para no duplicar
        .map(l => ({ sku: l.sku, name: l.productName, quantity: l.quantityChange }));

    return (
        <>
            <DocumentHeader title="Constancia de Movimiento" logId={mainLog.id} transactionId={mainLog.transactionId} />
            <InfoSection title="Datos del Movimiento">
                <InfoItem label="Fecha y Hora" value={new Date(mainLog.timestamp).toLocaleString()} />
                <InfoItem label="Tipo de Movimiento" value={<span className="font-bold">{isBulk ? 'TRANSFERENCIA MÚLTIPLE' : mainLog.type}</span>} />
                <InfoItem label="Usuario" value={mainLog.user} />
            </InfoSection>
            
            {isBulk ? (
                <>
                    <InfoSection title="Ubicación">
                        <InfoItem label="Desde Almacén" value={logEntries.find(l => l.type === 'SALIDA')?.warehouseName} />
                        <InfoItem label="Hacia Almacén" value={logEntries.find(l => l.type === 'ENTRADA')?.warehouseName} />
                    </InfoSection>
                    <ProductsTable products={products} />
                </>
            ) : (
                <>
                    <InfoSection title="Datos del Producto">
                        <InfoItem label="Producto" value={mainLog.productName} />
                        <InfoItem label="SKU" value={<span className="font-mono">{mainLog.sku}</span>} />
                        <InfoItem label="Cantidad Modificada" value={<span className={`font-bold ${mainLog.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>{mainLog.quantityChange > 0 ? `+${mainLog.quantityChange}` : mainLog.quantityChange}</span>} />
                         <InfoItem label="Nuevo Stock en Almacén" value={<span className="font-bold">{mainLog.newQuantityInWarehouse}</span>} />
                    </InfoSection>
                     <InfoSection title="Ubicación">
                        <InfoItem label="Almacén" value={mainLog.warehouseName} />
                    </InfoSection>
                </>
            )}

            <InfoSection title="Detalles Adicionales">
                 <div className="col-span-full">
                    <p className="text-gray-700 italic">{mainLog.details || 'Sin detalles adicionales.'}</p>
                </div>
            </InfoSection>
        </>
    );
};

const GuiaDespachoContent: React.FC<{ logEntries: LogEntry[] }> = ({ logEntries }) => {
    const salidaLogs = logEntries.filter(l => l.type === 'SALIDA');
    const mainLog = salidaLogs[0];
    if (!mainLog) return null; // No debería pasar si se llama correctamente

    const products = salidaLogs.map(l => ({ sku: l.sku, name: l.productName, quantity: l.quantityChange }));

    return (
        <>
            <DocumentHeader title="Guía de Despacho / Remisión" logId={mainLog.id} transactionId={mainLog.transactionId} />
             <InfoSection title="Información del Despacho">
                <InfoItem label="Fecha de Despacho" value={new Date(mainLog.timestamp).toLocaleString()} />
                <InfoItem label="Origen (Almacén)" value={<span className="font-bold">{mainLog.warehouseName}</span>} />
                <InfoItem label="Destino" value={mainLog.details.includes('Transferencia') ? logEntries.find(l => l.type === 'ENTRADA')?.warehouseName : 'Cliente / Externo'} />
                <InfoItem label="Despachado por" value={mainLog.user} />
            </InfoSection>

            <ProductsTable products={products} />
            
            <div className="mt-20">
                 <h3 className="text-sm font-bold uppercase text-gray-500 border-b border-gray-300 pb-1 mb-3">Firmas de Conformidad</h3>
                 <div className="grid grid-cols-2 gap-8 pt-8">
                     <div className="text-center">
                         <div className="border-b-2 border-gray-400 border-dotted pb-2 mb-2"></div>
                         <p className="font-semibold text-gray-800">Firma Despacho</p>
                         <p className="text-xs text-gray-600">Nombre: {mainLog.user}</p>
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

const GuiaRemisionContent: React.FC<{ logEntries: LogEntry[] }> = ({ logEntries }) => {
    const { companyInfo, users, warehouses } = useInventoryState();
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);
    
    const [transportista, setTransportista] = useState({ placa: '', dni: '', peso: '100' });
    const [observaciones, setObservaciones] = useState('Doc. Referencia: Factura:F001-00000066');
    const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [apiResponse, setApiResponse] = useState<GREResponse | null>(null);

    const salidaLogs = logEntries.filter(l => l.type === 'SALIDA');
    const mainLog = salidaLogs[0];
    if (!mainLog) return <div>Error: No hay registros de salida para generar la guía.</div>;

    // Asumimos que el destinatario es JAYCO (mock data)
    const destinatario = users.find(u => u.name.includes('JAYCO'));
    const puntoPartida = warehouses.find(w => w.name === mainLog.warehouseName)?.location || 'N/A';
    const puntoLlegada = warehouses.find(w => w.name === logEntries.find(l => l.type === 'ENTRADA')?.warehouseName)?.location || '150140 - AV. CAMINOS DEL INCA...';
    
    useEffect(() => {
        if (qrCanvasRef.current) {
            new window.QRious({
                element: qrCanvasRef.current,
                value: `RUC: ${companyInfo.ruc} | SERIE: TS01 | NUMERO: 00000019 | TIPO: 09`,
                size: 120,
                padding: 0
            });
        }
    }, [companyInfo.ruc]);

    const handleEmitirGRE = async () => {
        setApiStatus('loading');
        const payload = {
            companyInfo: { ruc: companyInfo.ruc },
            destinatario: {
                nombre: destinatario?.name || 'Cliente Varios',
                ruc: '20602640281' // Hardcoded RUC from image
            },
            puntos: { partida: puntoPartida, llegada: puntoLlegada },
            transportista: {
                placa: transportista.placa,
                dniConductor: transportista.dni,
                modalidad: 'TRANSPORTE PRIVADO',
                pesoTotalKg: parseFloat(transportista.peso) || 0
            },
            motivoTraslado: 'Venta',
            fechaInicioTraslado: new Date(mainLog.timestamp).toISOString().split('T')[0],
            items: salidaLogs.map(l => ({
                codigo: l.sku,
                descripcion: l.productName,
                cantidad: Math.abs(l.quantityChange),
                unidad: 'DOCENA' // Hardcoded for example
            })),
            documentoReferencia: observaciones
        };
        const response = await generateGRE_API(payload);
        setApiResponse(response);
        setApiStatus(response.success ? 'success' : 'error');
    };

    return (
        <div className="text-xs text-gray-800 font-sans p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
            <div className="grid grid-cols-3 gap-4 border-b pb-2">
                <div className="col-span-1 flex items-center gap-4">
                    <div className="w-24 h-24 bg-black rounded-full flex flex-col items-center justify-center text-white text-center p-2">
                        <span className="font-bold">TU LOGO</span>
                        <span>AQUÍ</span>
                    </div>
                    <div>
                        <p className="font-bold">{companyInfo.name}</p>
                        <p className="font-bold">{companyInfo.tradeName}</p>
                        <p><span className="font-semibold">Dirección fiscal:</span> {companyInfo.fiscalAddress}</p>
                        <p><span className="font-semibold">Sucursal:</span> {companyInfo.branchAddress}</p>
                    </div>
                </div>
                <div className="col-span-1"></div>
                <div className="col-span-1 border-2 border-black rounded-lg text-center p-2 h-24 flex flex-col justify-center">
                    <p className="font-bold text-lg">R.U.C. {companyInfo.ruc}</p>
                    <p className="font-bold text-lg">GUIA DE REMISIÓN</p>
                    <p className="font-bold text-lg">ELECTRÓNICA REMITENTE</p>
                    <p className="text-base">N° TS01 - 00000019</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                <div>
                    <p><span className="font-bold w-32 inline-block">Fecha de inicio de traslado:</span> {new Date(mainLog.timestamp).toLocaleDateString()}</p>
                    <p><span className="font-bold w-32 inline-block">Destinatario:</span> {destinatario?.name || 'Cliente Varios'}</p>
                    <p><span className="font-bold w-32 inline-block">RUC:</span> 20602640281</p>
                </div>
                <div>
                    <p><span className="font-bold w-24 inline-block">Punto de partida:</span> {puntoPartida}</p>
                    <p><span className="font-bold w-24 inline-block">Punto de llegada:</span> {puntoLlegada}</p>
                </div>
            </div>

            <div className="border border-gray-400 p-2 mt-2">
                <p className="font-bold mb-1">Motivo de traslado</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                    <div className="flex items-center"><input type="checkbox" checked readOnly className="mr-1"/> Venta</div>
                    <div className="flex items-center"><input type="checkbox" className="mr-1"/> Venta sujeta a confirmacion del comprador</div>
                    <div className="flex items-center"><input type="checkbox" className="mr-1"/> Compra</div>
                    <div className="flex items-center"><input type="checkbox" className="mr-1"/> Traslado entre establecimientos de la misma</div>
                    <div className="flex items-center"><input type="checkbox" className="mr-1"/> Importacion</div>
                    <div className="flex items-center"><input type="checkbox" className="mr-1"/> Traslado emisor itinerante CP</div>
                    <div className="flex items-center"><input type="checkbox" className="mr-1"/> Exportacion</div>
                    <div className="flex items-center"><input type="checkbox" className="mr-1"/> Traslado a zona primaria</div>
                    <div className="flex items-center"><input type="checkbox" className="mr-1"/> Otros</div>
                </div>
            </div>

            <div className="border-x border-b border-gray-400 mt-2">
                <p className="font-bold border-b border-gray-400 p-1">Datos del bien transportado</p>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-gray-400 bg-gray-100">
                            <th className="p-1 w-8 text-center font-bold">N°</th>
                            <th className="p-1 w-32 text-left font-bold border-l border-gray-400">CÓDIGO</th>
                            <th className="p-1 text-left font-bold border-l border-gray-400">DESCRIPCIÓN</th>
                            <th className="p-1 w-20 text-center font-bold border-l border-gray-400">CANTIDAD</th>
                            <th className="p-1 w-24 text-center font-bold border-l border-gray-400">UNIDAD DE DESPACHO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salidaLogs.map((l, index) => (
                        <tr key={l.id} className="border-b border-gray-200 h-10">
                            <td className="p-1 text-center">{index + 1}</td>
                            <td className="p-1 border-l border-gray-400">{l.sku}</td>
                            <td className="p-1 border-l border-gray-400">{l.productName}</td>
                            <td className="p-1 text-center border-l border-gray-400">{Math.abs(l.quantityChange)}</td>
                            <td className="p-1 border-l border-gray-400">DOCENA</td>
                        </tr>
                        ))}
                        {/* Fill empty rows */}
                        {Array.from({ length: Math.max(0, 5 - salidaLogs.length) }).map((_, i) => (
                             <tr key={`empty-${i}`} className="h-10"><td colSpan={5}>&nbsp;</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="border border-gray-400 mt-2 p-1 print:hidden">
                <p className="font-bold mb-1">Datos para Emisión (No se imprime)</p>
                <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="Placa del vehículo" value={transportista.placa} onChange={e => setTransportista(t => ({...t, placa: e.target.value}))} className="border border-gray-400 p-1 rounded-sm"/>
                    <input type="text" placeholder="DNI del Conductor" value={transportista.dni} onChange={e => setTransportista(t => ({...t, dni: e.target.value}))} className="border border-gray-400 p-1 rounded-sm"/>
                    <input type="number" placeholder="Peso Total Aprox (KGM)" value={transportista.peso} onChange={e => setTransportista(t => ({...t, peso: e.target.value}))} className="border border-gray-400 p-1 rounded-sm"/>
                </div>
                <textarea placeholder="Observaciones" value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} className="w-full border border-gray-400 p-1 mt-2 rounded-sm"></textarea>
                <div className="flex items-center gap-4 mt-2">
                    <button onClick={handleEmitirGRE} disabled={apiStatus === 'loading'} className="bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 disabled:bg-purple-400">
                        {apiStatus === 'loading' ? 'Emitiendo...' : 'Emitir GRE a SUNAT (Simulación)'}
                    </button>
                    {apiStatus === 'success' && <p className="text-green-600 font-bold">Éxito! CDR: {apiResponse?.cdr}</p>}
                    {apiStatus === 'error' && <p className="text-red-600 font-bold">Error: {apiResponse?.errors?.[0]}</p>}
                </div>
            </div>

             <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                 <div className="border border-gray-400 p-1">
                    <p className="font-bold border-b border-gray-400 mb-1">UNIDAD DE TRANSPORTE Y CONDUCTOR</p>
                    <p><span className="font-bold w-28 inline-block">Placa del vehículo:</span> {transportista.placa}</p>
                    <p><span className="font-bold w-28 inline-block">DNI del Conductor:</span> {transportista.dni}</p>
                </div>
                 <div className="border border-gray-400 p-1">
                    <p className="font-bold border-b border-gray-400 invisible">_</p>
                     <p><span className="font-bold w-36 inline-block">Modalidad de transporte:</span> TRANSPORTE PRIVADO</p>
                     <p><span className="font-bold w-36 inline-block">Peso Total Aprox. (KGM):</span> {transportista.peso}</p>
                 </div>
            </div>
            <div className="border border-gray-400 mt-1 p-1">
                <p><span className="font-bold">Observaciones:</span> {observaciones}</p>
            </div>


            <div className="flex justify-between items-end mt-2">
                <div>
                    <canvas ref={qrCanvasRef} id="qr-code"></canvas>
                    <p className="text-center font-semibold" style={{fontSize: '8px'}}>Representación Impresa de la GUIA DE REMISIÓN</p>
                    <p className="text-center font-semibold" style={{fontSize: '8px'}}>ELECTRÓNICA</p>
                    <p className="text-center" style={{fontSize: '7px'}}>Autorizado mediante Resolución 0340050007241</p>
                </div>
                <div className="border border-black w-64 h-24 flex flex-col justify-end p-2 text-center">
                    <div className="border-t border-dotted border-black w-full my-1"></div>
                    <p>Conformidad del cliente:</p>
                    <p>Nombre:</p>
                    <p>DNI:</p>
                </div>
            </div>
            
            <div className="text-center font-bold mt-2">
                <p>GRACIAS POR SU COMPRA!</p>
                <p>** NOTA IMPORTANTE **</p>
                <p>NO SE ACEPTAN DEVOLUCIONES</p>
            </div>
             <p className="text-center mt-2" style={{fontSize: '7px'}}>LA MERCADERIA VIAJA POR CUENTA Y RIESGO DEL COMPRADOR NO ADMITIMOS RECLAMO POR ROBO O AVERIA</p>
        </div>
    );
};

export const MovementDocumentModal = ({ logEntries, docType, onClose }: { logEntries: LogEntry[], docType: 'CONSTANCIA' | 'GUIA_DESPACHO' | 'GUIA_REMISION', onClose: () => void }) => {
    
    const mainLog = logEntries[0];
    let title = '';
    switch(docType) {
        case 'CONSTANCIA':
            title = `Constancia: ${mainLog.transactionId || mainLog.id}`;
            break;
        case 'GUIA_DESPACHO':
            title = `Guía de Despacho: ${mainLog.transactionId || mainLog.id}`;
            break;
        case 'GUIA_REMISION':
            title = `Guía de Remisión Electrónica: ${mainLog.transactionId || mainLog.id}`;
            break;
    }

    return (
        <>
        <style>
        {`
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .print-container, .print-container > div {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    border-radius: 0 !important;
                    overflow: visible !important;
                }
                 body > *:not(.print-container) {
                    display: none !important;
                }
                .print-content {
                    color: black !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .print\\:hidden { display: none !important; }
            }
        `}
        </style>
        <Modal isOpen={true} onClose={onClose} title={title}>
            <div id="printable-document" className="bg-white text-gray-800 rounded-md print-content">
                {docType === 'CONSTANCIA' && <ConstanciaContent logEntries={logEntries} />}
                {docType === 'GUIA_DESPACHO' && <GuiaDespachoContent logEntries={logEntries} />}
                {docType === 'GUIA_REMISION' && <GuiaRemisionContent logEntries={logEntries} />}
            </div>
        </Modal>
        </>
    );
};
