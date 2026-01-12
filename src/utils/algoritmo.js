export function calcularDistribuicao(pacientes, tecnicos, evitarQuebraEnfermaria = false, manterProximidade = false) { // <--- NOVO PARAMETRO
    // 1. Resetar técnicos
    tecnicos.forEach(t => {
        t.pacientes = [];
        t.carga = 0;
        t.temIsolamento = false;
        t.qtdAcamados = 0;
        t.qtdDietas = 0;
    });

    // 2. Calcular pesos individuais
    pacientes.forEach(p => {
        p.peso = 0;
        if (p.mobilidade === 'deambula') p.peso += 1;
        if (p.mobilidade === 'semi') p.peso += 2;
        if (p.mobilidade === 'acamado') p.peso += (p.grauAcamado === 'pouca') ? 4 : 3;
        if (p.dispositivos) p.peso += 1;
        if (p.irrigacao) p.peso += 2;
        if (p.grauExtra) p.peso += parseInt(p.grauExtra);
    });

    // 3. Separar Grupos
    const isolamentos = pacientes.filter(p => p.isolamento);
    const acamadosLimpos = pacientes.filter(p => !p.isolamento && p.mobilidade === 'acamado');
    const dietasLimpas = pacientes.filter(p => !p.isolamento && p.mobilidade !== 'acamado' && p.dispositivos);
    const resto = pacientes.filter(p => !p.isolamento && p.mobilidade !== 'acamado' && !p.dispositivos);

    // Ordenar
    isolamentos.sort((a, b) => b.peso - a.peso);
    acamadosLimpos.sort((a, b) => b.peso - a.peso);
    dietasLimpas.sort((a, b) => b.peso - a.peso);
    resto.sort((a, b) => b.peso - a.peso);

    // --- HELPERS ---
    const getEnfermaria = (leito) => leito ? (leito.includes('-') ? leito.split('-')[0] : leito) : '';
    
    // Transforma "306-1" em 306 para calcular matemática
    const getNumeroLeito = (leito) => {
        if (!leito) return 9999;
        const num = leito.split('-')[0]; // Pega "306" de "306-1"
        return parseInt(num.replace(/\D/g, '')) || 9999; // Remove letras se houver
    };

    const temColegaDeQuarto = (tec, pac) => {
        const enfPac = getEnfermaria(pac.leito);
        return tec.pacientes.some(p => getEnfermaria(p.leito) === enfPac);
    };

    // Calcula a distância do novo paciente para o paciente MAIS PRÓXIMO que o técnico já tem
    const getDistanciaMinima = (tec, pac) => {
        if (tec.pacientes.length === 0) return 0; // Se tá vazio, tanto faz
        const numPac = getNumeroLeito(pac.leito);
        
        // Encontra a menor diferença absoluta
        const distancias = tec.pacientes.map(p => Math.abs(numPac - getNumeroLeito(p.leito)));
        return Math.min(...distancias);
    };

    const podeReceber = (tec, pac) => {
        if (tec.restricao && pac.mobilidade !== 'deambula') return false;
        if (pac.evitarTecnicoId && pac.evitarTecnicoId === tec.id) return false;
        if (pac.nome && pac.nome.trim() !== '') {
            const nomeNovo = pac.nome.trim().split(' ')[0].toLowerCase();
            const temNomeIgual = tec.pacientes.some(p => {
                if (!p.nome) return false;
                return p.nome.trim().split(' ')[0].toLowerCase() === nomeNovo;
            });
            if (temNomeIgual) return false;
        }
        return true;
    };

    const atribuir = (tec, pac) => {
        tec.pacientes.push(pac);
        tec.carga += pac.peso;
        if (pac.isolamento) tec.temIsolamento = true;
        if (pac.mobilidade === 'acamado') tec.qtdAcamados++;
        if (pac.dispositivos) tec.qtdDietas++;
    };

    // --- FASE 1: Isolamentos ---
    isolamentos.forEach(pac => {
        let candidatos = tecnicos.filter(t => !t.temIsolamento && podeReceber(t, pac));
        if (candidatos.length === 0) candidatos = tecnicos.filter(t => podeReceber(t, pac));
        if (candidatos.length === 0) candidatos = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));

        if (candidatos.length > 0) {
            candidatos.sort((a, b) => a.pacientes.length - b.pacientes.length || a.carga - b.carga);
            atribuir(candidatos[0], pac);
        }
    });

    // --- FASE 2: Acamados (Prioridade: Igualdade de Pesados) ---
    acamadosLimpos.forEach(pac => {
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));
        if (candidatos.length > 0) {
            candidatos.sort((a, b) => {
                if (a.qtdAcamados !== b.qtdAcamados) return a.qtdAcamados - b.qtdAcamados;
                if (a.pacientes.length !== b.pacientes.length) return a.pacientes.length - b.pacientes.length;
                
                // Proximidade entra aqui também como desempate
                if (manterProximidade) {
                    const distA = getDistanciaMinima(a, pac);
                    const distB = getDistanciaMinima(b, pac);
                    if (distA !== distB) return distA - distB; // Menor distância ganha
                }

                return a.carga - b.carga;
            });
            atribuir(candidatos[0], pac);
        } else {
            let fallback = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
            if(fallback.length > 0) {
                fallback.sort((a, b) => a.qtdAcamados - b.qtdAcamados);
                atribuir(fallback[0], pac);
            }
        }
    });

    // --- FASE 3: Dietas ---
    dietasLimpas.forEach(pac => {
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));
        if (candidatos.length > 0) {
            candidatos.sort((a, b) => {
                if (a.qtdDietas !== b.qtdDietas) return a.qtdDietas - b.qtdDietas;
                if (a.pacientes.length !== b.pacientes.length) return a.pacientes.length - b.pacientes.length;
                
                if (evitarQuebraEnfermaria) {
                    const aTem = temColegaDeQuarto(a, pac);
                    const bTem = temColegaDeQuarto(b, pac);
                    if (aTem && !bTem) return -1; 
                    if (!aTem && bTem) return 1;  
                }

                // Critério de Proximidade (Vizinhos)
                if (manterProximidade) {
                    const distA = getDistanciaMinima(a, pac);
                    const distB = getDistanciaMinima(b, pac);
                    // Se a diferença for grande, prioriza. Se for pequena, ignora.
                    if (distA !== distB) return distA - distB;
                }

                return a.carga - b.carga;
            });
            atribuir(candidatos[0], pac);
        } else {
            let fallback = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
            if(fallback.length > 0) {
                fallback.sort((a, b) => a.qtdDietas - b.qtdDietas);
                atribuir(fallback[0], pac);
            }
        }
    });

    // --- FASE 4: O Resto ---
    resto.forEach(pac => {
        let candidatos = tecnicos.filter(t => podeReceber(t, pac));
        if (candidatos.length > 0) {
            candidatos.sort((a, b) => {
                // 1. Número de pacientes (Supremo)
                if (a.pacientes.length !== b.pacientes.length) return a.pacientes.length - b.pacientes.length;

                // 2. Enfermaria (Colegas de quarto)
                if (evitarQuebraEnfermaria) {
                    const aTem = temColegaDeQuarto(a, pac);
                    const bTem = temColegaDeQuarto(b, pac);
                    if (aTem && !bTem) return -1; 
                    if (!aTem && bTem) return 1;  
                }

                // 3. Proximidade (Vizinhos de porta) - NOVO
                if (manterProximidade) {
                    const distA = getDistanciaMinima(a, pac);
                    const distB = getDistanciaMinima(b, pac);
                    if (distA !== distB) return distA - distB;
                }

                return a.carga - b.carga;
            });
            atribuir(candidatos[0], pac);
        } else {
            let fallback = tecnicos.filter(t => !(t.restricao && pac.mobilidade !== 'deambula'));
            if(fallback.length > 0) {
                fallback.sort((a, b) => a.pacientes.length - b.pacientes.length);
                atribuir(fallback[0], pac);
            }
        }
    });

    return tecnicos;
}