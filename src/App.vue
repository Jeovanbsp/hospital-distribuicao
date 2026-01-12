<script setup>
import { ref, computed, onMounted } from 'vue';
import { SETORES } from './data/leitos';
import { calcularDistribuicao } from './utils/algoritmo';

// --- ESTADOS ---
const etapa = ref(1);
const setorSelecionado = ref('');
const qtdTecnicos = ref(4);
const evitarQuebraEnfermaria = ref(true);
const listaTecnicos = ref([]);
const listaLeitos = ref([]);
const resultadoDistribuicao = ref([]);
const isDark = ref(false); 
const isSidebarOpen = ref(false); // NOVO: Estado do Menu Mobile

// --- LÓGICA DO TEMA ESCURO ---
onMounted(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        isDark.value = true;
        document.documentElement.classList.add('dark');
    }
});

const toggleDark = () => {
    isDark.value = !isDark.value;
    if (isDark.value) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    }
};

// --- FUNÇÕES DO SISTEMA ---
const gerarTecnicos = () => {
    const atual = listaTecnicos.value.length;
    const alvo = qtdTecnicos.value;
    if (alvo > atual) {
        for (let i = atual + 1; i <= alvo; i++) {
            listaTecnicos.value.push({ id: i, nome: `Técnico ${i}`, restricao: false, pacientes: [], carga: 0 });
        }
    } else if (alvo < atual) {
        listaTecnicos.value = listaTecnicos.value.slice(0, alvo);
    }
    if(listaTecnicos.value.length === 0) {
         for (let i = 1; i <= qtdTecnicos.value; i++) {
            listaTecnicos.value.push({ id: i, nome: `Técnico ${i}`, restricao: false, pacientes: [], carga: 0 });
        }
    }
};
gerarTecnicos();

const avanarParaPacientes = () => {
    if (!setorSelecionado.value) return alert("Selecione um setor para continuar.");
    if(listaLeitos.value.length === 0 || listaLeitos.value[0]?.setorOrigem !== setorSelecionado.value) {
        const leitosDoSetor = SETORES[setorSelecionado.value];
        listaLeitos.value = leitosDoSetor.map(num => ({
            leito: num, ocupado: false, nome: '', mobilidade: 'deambula', grauAcamado: 'pouca',
            dispositivos: false, irrigacao: false, isolamento: false, 
            grauExtra: 0, motivoExtra: '', evitarTecnicoId: null, setorOrigem: setorSelecionado.value
        }));
    }
    etapa.value = 2;
    window.scrollTo(0,0);
};

const toggleLeito = (item) => {
    item.ocupado = !item.ocupado;
    if(!item.ocupado) {
        item.nome = ''; item.mobilidade = 'deambula'; item.grauAcamado = 'pouca';
        item.dispositivos = false; item.irrigacao = false; item.isolamento = false; 
        item.grauExtra = 0; item.motivoExtra = ''; item.evitarTecnicoId = null;
    }
};

const calcular = () => {
    const pacientesAtivos = listaLeitos.value.filter(l => l.ocupado);
    if (pacientesAtivos.length === 0) return alert("Selecione pelo menos um leito ocupado.");
    const tecnicosCopy = JSON.parse(JSON.stringify(listaTecnicos.value));
    resultadoDistribuicao.value = calcularDistribuicao(pacientesAtivos, tecnicosCopy, evitarQuebraEnfermaria.value);
    etapa.value = 3;
    window.scrollTo(0,0);
};

const reiniciar = () => {
    if(confirm("Iniciar novo plantão?")) {
        etapa.value = 1; resultadoDistribuicao.value = []; setorSelecionado.value = '';
        isSidebarOpen.value = false; // Fecha o menu ao reiniciar
    }
};

const totalPacientes = computed(() => listaLeitos.value.filter(l => l.ocupado).length);

const filaAdmissao = computed(() => {
    if (resultadoDistribuicao.value.length === 0) return [];
    const ordenados = [...resultadoDistribuicao.value];
    ordenados.sort((a, b) => {
        if (a.pacientes.length !== b.pacientes.length) return a.pacientes.length - b.pacientes.length;
        return a.carga - b.carga;
    });
    return ordenados;
});
</script>

<template>
  <div class="flex h-screen bg-[#FDFBFD] dark:bg-gray-900 font-sans text-gray-600 dark:text-gray-300 overflow-hidden transition-colors duration-300">
    
    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" 
         class="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"></div>

    <aside class="fixed md:relative inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col shadow-2xl md:shadow-sm z-40 transition-transform duration-300 ease-in-out transform"
        :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'">
        
        <div class="p-6 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                    <i class="fa-solid fa-hospital-user text-lg"></i>
                </div>
                <div>
                    <h1 class="font-bold text-gray-800 dark:text-white leading-tight">S.D.P.</h1>
                    <p class="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Hospitalar</p>
                </div>
            </div>
            <button @click="isSidebarOpen = false" class="md:hidden text-gray-400 hover:text-red-500">
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>
        </div>
        
        <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
            <div class="nav-item" :class="{ 'active': etapa === 1 }" @click="etapa = 1; isSidebarOpen = false"><i class="fa-solid fa-sliders w-6"></i> Configuração</div>
            <div class="nav-item" :class="{ 'active': etapa === 2 }" @click="listaLeitos.length > 0 ? (etapa = 2, isSidebarOpen = false) : avanarParaPacientes()"><i class="fa-solid fa-bed-pulse w-6"></i> Triagem</div>
            <div class="nav-item" :class="{ 'active': etapa === 3 }" @click="resultadoDistribuicao.length > 0 ? (etapa = 3, isSidebarOpen = false) : null"><i class="fa-solid fa-clipboard-list w-6"></i> Relatório</div>
            <div class="mt-8 pt-4 border-t border-gray-50 dark:border-gray-700">
                <div class="nav-item" :class="{ 'active': etapa === 4 }" @click="etapa = 4; isSidebarOpen = false"><i class="fa-solid fa-book-open w-6"></i> Regras & Pesos</div>
            </div>
        </nav>

        <div class="p-6 border-t border-gray-50 dark:border-gray-700 space-y-4">
            <button @click="toggleDark" class="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300"
                :class="isDark ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
                <i class="fa-solid" :class="isDark ? 'fa-sun' : 'fa-moon'"></i>
                {{ isDark ? 'Claro' : 'Escuro' }}
            </button>

            <div class="bg-primary-light dark:bg-gray-700 p-4 rounded-xl text-center">
                <p class="text-xs text-primary dark:text-primary-hover font-bold mb-1">Setor Atual</p>
                <p class="text-xl font-bold text-gray-800 dark:text-white">{{ setorSelecionado || '--' }}</p>
            </div>
        </div>
    </aside>

    <div class="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header class="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 flex justify-between items-center z-30 sticky top-0 shadow-sm">
            <button @click="isSidebarOpen = true" class="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-white flex items-center justify-center hover:bg-gray-100 transition">
                <i class="fa-solid fa-bars text-lg"></i>
            </button>

            <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-primary text-white rounded-md flex items-center justify-center"><i class="fa-solid fa-hospital-user text-sm"></i></div>
                <span class="font-bold text-gray-700 dark:text-white">S.D.P.</span>
            </div>
            
            <div class="flex items-center gap-2">
                 <span v-if="setorSelecionado" class="text-xs font-bold bg-primary-light dark:bg-gray-700 text-primary px-3 py-1 rounded-full">{{ setorSelecionado }}</span>
            </div>
        </header>

        <main class="flex-1 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10 scroll-smooth">
            <div class="max-w-5xl mx-auto min-h-full flex flex-col">
                
                <div class="mb-8">
                    <h2 class="text-2xl font-bold text-gray-800 dark:text-white">
                        <span v-if="etapa === 1">Configuração do Plantão</span>
                        <span v-if="etapa === 2">Mapa de Leitos e Pacientes</span>
                        <span v-if="etapa === 3">Distribuição Final</span>
                        <span v-if="etapa === 4">Entenda o Algoritmo</span>
                    </h2>
                    <p class="text-gray-400 mt-1 text-sm">Gerencie a equipe e otimize a carga de trabalho.</p>
                </div>

                <transition name="fade" mode="out-in">
                <div v-if="etapa === 1" class="grid lg:grid-cols-2 gap-8">
                    <div class="space-y-6">
                        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div class="mb-6">
                                <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Selecione o Setor</label>
                                <div class="relative">
                                    <select v-model="setorSelecionado" class="w-full p-4 bg-gray-50 dark:bg-gray-700 dark:text-white border-none rounded-xl text-gray-700 font-bold focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                                        <option value="" disabled>Escolha na lista...</option>
                                        <option v-for="s in Object.keys(SETORES)" :key="s" :value="s">{{ s }}</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                                </div>
                            </div>
                            
                            <div class="mb-6 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition" @click="evitarQuebraEnfermaria = !evitarQuebraEnfermaria">
                                <div>
                                    <p class="font-bold text-gray-700 dark:text-white text-sm">Manter Enfermaria</p>
                                    <p class="text-[10px] text-gray-400">Tenta não separar leitos do mesmo quarto.</p>
                                </div>
                                <div class="w-12 h-6 rounded-full p-1 transition duration-300 ease-in-out" :class="evitarQuebraEnfermaria ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'">
                                    <div class="w-4 h-4 bg-white rounded-full shadow-md transform duration-300 ease-in-out" :class="evitarQuebraEnfermaria ? 'translate-x-6' : 'translate-x-0'"></div>
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Técnicos no Plantão</label>
                                <div class="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-xl">
                                    <button @click="qtdTecnicos > 1 ? qtdTecnicos-- : null; gerarTecnicos()" class="w-12 h-12 bg-white dark:bg-gray-600 rounded-lg text-gray-400 dark:text-white hover:text-primary shadow-sm hover:shadow transition text-xl font-bold">-</button>
                                    <span class="text-2xl font-bold text-primary">{{ qtdTecnicos }}</span>
                                    <button @click="qtdTecnicos < 8 ? qtdTecnicos++ : null; gerarTecnicos()" class="w-12 h-12 bg-primary text-white rounded-lg shadow-lg shadow-primary/30 hover:bg-primary-hover transition text-xl font-bold">+</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-if="listaTecnicos.length > 0" class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Equipe de Enfermagem</h3>
                        <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
                            <div v-for="tec in listaTecnicos" :key="tec.id" class="flex items-center gap-3 group">
                                <div class="w-10 h-10 rounded-full bg-primary-light dark:bg-gray-700 text-primary flex items-center justify-center font-bold text-sm">{{ tec.id }}</div>
                                <input type="text" v-model="tec.nome" class="flex-1 bg-transparent border-b border-gray-100 dark:border-gray-700 focus:border-primary outline-none py-2 text-gray-700 dark:text-white placeholder-gray-300 transition" placeholder="Nome do Técnico">
                                <label class="cursor-pointer flex items-center gap-2 group/chk">
                                    <span class="text-[10px] font-bold uppercase tracking-wider transition hidden sm:block" :class="tec.restricao ? 'text-red-500' : 'text-gray-300 group-hover/chk:text-gray-400'">Restrição</span>
                                    <div class="relative">
                                        <input type="checkbox" v-model="tec.restricao" class="hidden peer">
                                        <div class="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-300 flex items-center justify-center transition peer-checked:bg-red-50 peer-checked:border-red-200 peer-checked:text-white peer-checked:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700"><i class="fa-solid fa-ban"></i></div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                </transition>

                <transition name="fade" mode="out-in">
                <div v-if="etapa === 2">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <div v-for="item in listaLeitos" :key="item.leito" class="bg-white dark:bg-gray-800 rounded-xl border transition-all duration-300 relative group overflow-hidden" :class="item.ocupado ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary' : 'border-gray-100 dark:border-gray-700 hover:border-primary/30 hover:shadow-md'">
                            <div @click="toggleLeito(item)" class="p-4 cursor-pointer flex justify-between items-center select-none" :class="item.ocupado ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'">
                                <span class="font-bold text-lg">{{ item.leito }}</span>
                                <div v-if="!item.ocupado" class="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 group-hover:border-primary/50 group-hover:text-primary flex items-center justify-center text-xs"><i class="fa-solid fa-plus"></i></div>
                                <div v-else class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"><i class="fa-solid fa-check text-xs"></i></div>
                            </div>
                            <div v-if="item.ocupado" class="p-4 space-y-4 animate-fade-in">
                                <input type="text" v-model="item.nome" class="w-full text-sm font-medium bg-transparent border-b border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white focus:border-primary outline-none py-1 placeholder-gray-300" placeholder="Nome (Opcional)">
                                <div class="flex gap-2">
                                    <label class="flex-1 cursor-pointer"><input type="radio" value="deambula" v-model="item.mobilidade" class="hidden peer"><div class="h-16 rounded-lg border border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 flex flex-col items-center justify-center text-gray-400 peer-checked:bg-green-50 peer-checked:dark:bg-green-900/30 peer-checked:border-green-400 peer-checked:text-green-600 transition hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm"><i class="fa-solid fa-person-walking text-lg mb-1"></i><span class="text-[9px] font-bold uppercase">Leve</span></div></label>
                                    <label class="flex-1 cursor-pointer"><input type="radio" value="semi" v-model="item.mobilidade" class="hidden peer"><div class="h-16 rounded-lg border border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 flex flex-col items-center justify-center text-gray-400 peer-checked:bg-yellow-50 peer-checked:dark:bg-yellow-900/30 peer-checked:border-yellow-400 peer-checked:text-yellow-600 transition hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm"><i class="fa-solid fa-wheelchair text-lg mb-1"></i><span class="text-[9px] font-bold uppercase">Médio</span></div></label>
                                    <label class="flex-1 cursor-pointer"><input type="radio" value="acamado" v-model="item.mobilidade" class="hidden peer"><div class="h-16 rounded-lg border border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 flex flex-col items-center justify-center text-gray-400 peer-checked:bg-red-50 peer-checked:dark:bg-red-900/30 peer-checked:border-red-400 peer-checked:text-red-600 transition hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm"><i class="fa-solid fa-bed-pulse text-lg mb-1"></i><span class="text-[9px] font-bold uppercase">Pesado</span></div></label>
                                </div>
                                <div v-if="item.mobilidade === 'acamado'" class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800 animate-fade-in">
                                    <p class="text-[10px] font-bold text-red-500 uppercase mb-2">Mobilidade no Leito:</p>
                                    <div class="flex gap-2">
                                        <label class="flex-1 cursor-pointer"><input type="radio" value="boa" v-model="item.grauAcamado" class="hidden peer"><div class="py-2 text-center text-xs font-bold rounded border border-red-200 dark:border-red-700 text-red-400 dark:text-red-300 bg-white dark:bg-gray-800 peer-checked:bg-red-200 peer-checked:dark:bg-red-800 peer-checked:text-red-700 peer-checked:dark:text-white transition">Boa</div></label>
                                        <label class="flex-1 cursor-pointer"><input type="radio" value="pouca" v-model="item.grauAcamado" class="hidden peer"><div class="py-2 text-center text-xs font-bold rounded border border-red-200 dark:border-red-700 text-red-400 dark:text-red-300 bg-white dark:bg-gray-800 peer-checked:bg-red-500 peer-checked:text-white transition">Pouca</div></label>
                                    </div>
                                </div>
                                <div class="space-y-2 pt-2 border-t border-gray-50 dark:border-gray-700">
                                    <label class="flex items-center gap-2 cursor-pointer group/chk"><div class="relative flex items-center"><input type="checkbox" v-model="item.dispositivos" class="peer h-4 w-4 appearance-none rounded border border-gray-300 dark:border-gray-600 checked:bg-purple-500 checked:border-purple-500 transition"><i class="fa-solid fa-check text-white text-[10px] absolute left-[3px] opacity-0 peer-checked:opacity-100 pointer-events-none"></i></div><span class="text-xs text-gray-600 dark:text-gray-300 group-hover/chk:text-purple-600 transition">Usa SNE / GTM</span></label>
                                    <label class="flex items-center gap-2 cursor-pointer group/chk"><div class="relative flex items-center"><input type="checkbox" v-model="item.irrigacao" class="peer h-4 w-4 appearance-none rounded border border-gray-300 dark:border-gray-600 checked:bg-blue-500 checked:border-blue-500 transition"><i class="fa-solid fa-check text-white text-[10px] absolute left-[3px] opacity-0 peer-checked:opacity-100 pointer-events-none"></i></div><span class="text-xs text-gray-600 dark:text-gray-300 font-bold group-hover/chk:text-blue-500 transition">Irrigação (+2)</span></label>
                                    <label class="flex items-center gap-2 cursor-pointer group/chk"><div class="relative flex items-center"><input type="checkbox" v-model="item.isolamento" class="peer h-4 w-4 appearance-none rounded border border-gray-300 dark:border-gray-600 checked:bg-red-500 checked:border-red-500 transition"><i class="fa-solid fa-check text-white text-[10px] absolute left-[3px] opacity-0 peer-checked:opacity-100 pointer-events-none"></i></div><span class="text-xs font-bold text-gray-600 dark:text-gray-300 group-hover/chk:text-red-600 transition flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Isolamento</span></label>
                                </div>
                                <div class="bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-lg p-3 space-y-2">
                                    <p class="text-[10px] font-bold text-gray-400 uppercase">Adicionar Grau (1-3)</p>
                                    <div class="flex gap-2"><button v-for="n in 3" :key="n" @click="item.grauExtra = item.grauExtra === n ? 0 : n" class="flex-1 py-1 rounded text-xs font-bold border transition" :class="item.grauExtra === n ? 'bg-gray-800 dark:bg-gray-600 text-white border-gray-800 dark:border-gray-600' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400'">+{{ n }}</button></div>
                                    <input v-if="item.grauExtra > 0" type="text" v-model="item.motivoExtra" class="w-full text-xs p-2 bg-white dark:bg-gray-800 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:border-gray-400 outline-none" placeholder="Informar motivo (Ex: Familiar)">
                                </div>
                                <select v-model="item.evitarTecnicoId" class="w-full text-[10px] p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-300 border-none outline-none mt-2">
                                    <option :value="null">Evitar repetição: Nenhum</option>
                                    <option v-for="t in listaTecnicos" :key="t.id" :value="t.id">Não repetir: {{ t.nome }}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                </transition>

                <transition name="fade" mode="out-in">
                <div v-if="etapa === 3">
                    <div class="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 mb-8 text-white shadow-lg shadow-gray-200 dark:shadow-none">
                        <h3 class="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><i class="fa-solid fa-list-ol"></i> Fila de Admissão</h3>
                        <div class="flex flex-wrap gap-4">
                            <div v-for="(tec, index) in filaAdmissao" :key="tec.id" class="flex items-center gap-3 bg-white/10 px-4 py-3 rounded-xl border border-white/10 backdrop-blur-sm">
                                <div class="w-8 h-8 rounded-full bg-white text-gray-900 font-bold flex items-center justify-center text-sm shadow-md">{{ index + 1 }}º</div>
                                <div><div class="font-bold text-sm">{{ tec.nome }}</div><div class="text-[10px] text-gray-400 flex gap-2"><span>Pacientes: {{ tec.pacientes.length }}</span><span>|</span><span>Carga: {{ tec.carga }}</span></div></div>
                            </div>
                        </div>
                        <p class="text-[10px] text-gray-500 mt-4 italic">* Ordem baseada primeiro na quantidade de pacientes, depois na carga.</p>
                    </div>
                    <div class="grid md:grid-cols-2 gap-6">
                        <div v-for="tec in resultadoDistribuicao" :key="tec.id" class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
                            <div class="p-5 border-b border-gray-50 dark:border-gray-700 flex justify-between items-start bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700">
                                <div class="flex gap-4"><div class="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20">{{ tec.id }}</div><div><h3 class="font-bold text-lg text-gray-800 dark:text-white">{{ tec.nome }}</h3><div class="flex gap-2 mt-1"><span class="text-[10px] font-bold bg-primary-light dark:bg-gray-600 text-primary dark:text-white px-2 py-1 rounded">Carga: {{ tec.carga }}</span><span v-if="tec.restricao" class="text-[10px] font-bold bg-red-50 text-red-500 px-2 py-1 rounded border border-red-100">Restrição</span></div></div></div>
                                <div class="text-center"><span class="block text-2xl font-bold text-gray-300">{{ tec.pacientes.length }}</span></div>
                            </div>
                            <div class="p-4 flex-1 bg-white dark:bg-gray-800 space-y-2">
                                <div v-for="p in tec.pacientes" :key="p.leito" class="p-3 rounded-xl border flex flex-col gap-2 group hover:shadow-md transition" :class="p.isolamento ? 'border-l-4 border-l-red-500 bg-red-50/10 dark:bg-red-900/20 border-gray-100 dark:border-gray-700' : 'border-l-4 border-l-primary bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'">
                                    <div class="flex items-center justify-between"><div class="flex items-center gap-2"><span class="bg-gray-800 dark:bg-gray-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{{ p.leito }}</span><span class="font-bold text-gray-700 dark:text-gray-200 text-sm">{{ p.nome || 'Paciente' }}</span></div><div class="text-lg font-bold text-gray-200 dark:text-gray-600 group-hover:text-primary-light transition">{{ p.peso }}</div></div>
                                    <div class="flex flex-wrap gap-1">
                                         <span class="px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wide" :class="{ 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-100 dark:border-green-800': p.mobilidade === 'deambula', 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-100 dark:border-yellow-800': p.mobilidade === 'semi', 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800': p.mobilidade === 'acamado' }">{{ p.mobilidade }}</span>
                                        <span v-if="p.mobilidade === 'acamado'" class="px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-100 dark:border-red-800 text-red-500 dark:text-red-300 bg-red-50 dark:bg-red-900/20">{{ p.grauAcamado === 'boa' ? 'MOB. BOA' : 'MOB. POUCA' }}</span>
                                        <span v-if="p.dispositivos" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">SNE</span>
                                        <span v-if="p.irrigacao" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800">IRRIGAÇÃO</span>
                                        <span v-if="p.isolamento" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-800 animate-pulse">ISO</span>
                                        <span v-if="p.grauExtra > 0" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">+{{ p.grauExtra }} EXTRA</span>
                                    </div>
                                    <div v-if="p.grauExtra > 0 && p.motivoExtra" class="text-[10px] text-gray-500 dark:text-gray-400 italic border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">Obs: {{ p.motivoExtra }}</div>
                                </div>
                                <div v-if="tec.pacientes.length === 0" class="h-24 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl"><i class="fa-solid fa-mug-hot mb-1"></i><span class="text-xs">Livre</span></div>
                            </div>
                        </div>
                    </div>
                </div>
                </transition>

                <transition name="fade" mode="out-in">
                <div v-if="etapa === 4">
                    <div class="space-y-6">
                        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"><h3 class="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><i class="fa-solid fa-person-walking"></i> Classificação de Mobilidade</h3><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><div class="p-4 rounded-xl border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900/20"><div class="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">1 Ponto</div><div class="font-bold text-green-800 dark:text-green-300 text-sm">Leve (Deambula)</div><p class="text-xs text-green-600 dark:text-green-400 mt-1">Independente para banho e locomoção.</p></div><div class="p-4 rounded-xl border border-yellow-100 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20"><div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">2 Pontos</div><div class="font-bold text-yellow-800 dark:text-yellow-300 text-sm">Médio (Semi)</div><p class="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Precisa de auxílio parcial ou banho de aspersão com cadeira.</p></div><div class="p-4 rounded-xl border border-red-100 dark:border-red-800 bg-white dark:bg-gray-800"><div class="text-2xl font-bold text-red-400 dark:text-red-300 mb-1">3 Pontos</div><div class="font-bold text-red-500 dark:text-red-300 text-sm">Pesado (Boa Mobilidade)</div><p class="text-xs text-red-400 dark:text-red-300 mt-1">Acamado, mas ajuda na mudança de decúbito.</p></div><div class="p-4 rounded-xl border border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/20"><div class="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">4 Pontos</div><div class="font-bold text-red-800 dark:text-red-300 text-sm">Pesado (Pouca Mobilidade)</div><p class="text-xs text-red-600 dark:text-red-400 mt-1">Totalmente dependente. Exige esforço físico máximo.</p></div></div></div>
                        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"><h3 class="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><i class="fa-solid fa-stethoscope"></i> Adicionais Técnicos</h3><div class="grid grid-cols-1 md:grid-cols-3 gap-4"><div class="p-4 rounded-xl border border-purple-100 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-lg shadow-sm">+1</div><div><div class="font-bold text-purple-800 dark:text-purple-300 text-sm">SNE / GTM</div><p class="text-xs text-purple-600 dark:text-purple-400">Dieta enteral ou Gastrostomia.</p></div></div><div class="p-4 rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-lg shadow-sm">+2</div><div><div class="font-bold text-blue-800 dark:text-blue-300 text-sm">Irrigação</div><p class="text-xs text-blue-600 dark:text-blue-400">Vesical contínua. Troca frequente de soro.</p></div></div><div class="p-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-white dark:bg-gray-600 text-gray-800 dark:text-white flex items-center justify-center font-bold text-lg shadow-sm">1-3</div><div><div class="font-bold text-gray-800 dark:text-white text-sm">Grau Extra</div><p class="text-xs text-gray-500 dark:text-gray-400">Complexidade familiar ou comportamental.</p></div></div></div></div>
                        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"><h3 class="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><i class="fa-solid fa-scale-balanced"></i> Lógica de Distribuição</h3><ul class="space-y-4 text-sm text-gray-600 dark:text-gray-300"><li class="flex gap-3"><div class="min-w-[24px] h-6 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center text-xs font-bold">1</div><p><strong>Isolamentos:</strong> São distribuídos primeiro. O sistema tenta colocar no máximo 1 isolamento por técnico para evitar contaminação cruzada.</p></li><li class="flex gap-3"><div class="min-w-[24px] h-6 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center text-xs font-bold">2</div><p><strong>Pacientes Pesados:</strong> O sistema ignora a carga total e foca na <strong>quantidade</strong>. Se há 4 técnicos e 4 pesados, cada um receberá 1, mesmo que um técnico já tenha vários leves.</p></li><li class="flex gap-3"><div class="min-w-[24px] h-6 rounded-full bg-primary-light dark:bg-gray-700 text-primary dark:text-white flex items-center justify-center text-xs font-bold">3</div><p><strong>Igualdade Numérica:</strong> O sistema preenche as vagas com pacientes médios/leves focando em deixar todos com o <strong>mesmo número de pacientes</strong>.</p></li><li class="flex gap-3"><div class="min-w-[24px] h-6 rounded-full bg-gray-800 dark:bg-gray-600 text-white flex items-center justify-center text-xs font-bold">4</div><p><strong>Fila de Admissão:</strong> Quem termina com <strong>menos pacientes</strong> é o 1º da fila. Se empatar, ganha quem tiver a menor carga.</p></li></ul></div>
                    </div>
                </div>
                </transition>

                <div class="flex-grow"></div>

                <div class="mt-12 py-6 border-t border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="hidden md:block text-xs text-gray-400 font-bold uppercase tracking-wide">Sistema de Distribuição</div>
                    <div class="flex gap-4 w-full md:w-auto">
                        <button v-if="etapa > 1 && etapa !== 4" @click="etapa--" class="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary transition">Voltar</button>
                        <button v-if="etapa === 4" @click="etapa = 1" class="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary transition">Voltar p/ Início</button>
                        <button v-if="etapa === 1" @click="avanarParaPacientes" class="flex-1 md:flex-none px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-hover hover:shadow-primary/50 transition transform active:scale-95 flex items-center justify-center gap-2">Iniciar Triagem <i class="fa-solid fa-arrow-right"></i></button>
                        <button v-if="etapa === 2" @click="calcular" class="flex-1 md:flex-none px-8 py-3 rounded-xl bg-green-500 text-white font-bold shadow-lg shadow-green-500/30 hover:bg-green-600 transition transform active:scale-95 flex items-center justify-center gap-2">Distribuir Pacientes <i class="fa-solid fa-check"></i></button>
                         <button v-if="etapa === 3" @click="reiniciar" class="flex-1 md:flex-none px-8 py-3 rounded-xl bg-gray-800 dark:bg-gray-600 text-white font-bold shadow-lg hover:bg-gray-900 dark:hover:bg-gray-500 transition transform active:scale-95">Novo Plantão</button>
                    </div>
                </div>

                <footer class="mt-8 pt-10 border-t border-gray-100 dark:border-gray-700 text-center pb-10 bg-white dark:bg-gray-800 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                    <p class="text-gray-600 dark:text-gray-300 mb-6 font-medium text-lg tracking-tight">Qualquer dúvida, entre em contato com o Suporte:</p>
                    <div class="flex justify-center items-center gap-6 mb-8">
                        <a href="https://instagram.com/Jeo_Dev" target="_blank" class="transform hover:-translate-y-1 transition duration-300 group">
                            <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:shadow-pink-500/40"><i class="fa-brands fa-instagram text-3xl"></i></div>
                            <span class="block text-[10px] mt-2 font-bold text-gray-400 group-hover:text-pink-500 transition">@Jeo_Dev</span>
                        </a>
                        <a href="https://wa.me/5571987790138" target="_blank" class="transform hover:-translate-y-1 transition duration-300 group">
                            <div class="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40"><i class="fa-brands fa-whatsapp text-3xl"></i></div>
                            <span class="block text-[10px] mt-2 font-bold text-gray-400 group-hover:text-green-500 transition">WhatsApp</span>
                        </a>
                    </div>
                    <div class="text-sm text-gray-400 font-medium">Jeovan Bispo &copy; 2026. All Rights Reserved</div>
                    <div class="text-xs text-primary mt-1 font-bold opacity-60 uppercase tracking-widest">Sistema de Distribuição</div>
                </footer>
            </div>
        </main>
    </div>
  </div>
</template>

<style scoped>
.nav-item {
    @apply flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary;
}
.nav-item.active {
    @apply bg-primary-light dark:bg-gray-700 text-primary dark:text-white font-bold;
}
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-track { background: transparent; }
.custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
</style>