<script setup>
import { ref, computed } from 'vue';
import { SETORES } from './data/leitos';
import { calcularDistribuicao } from './utils/algoritmo';

// --- LÓGICA DO SISTEMA ---
const etapa = ref(1);
const setorSelecionado = ref('');
const qtdTecnicos = ref(4);
const listaTecnicos = ref([]);
const listaLeitos = ref([]);
const resultadoDistribuicao = ref([]);

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
            leito: num, ocupado: false, nome: '', mobilidade: 'deambula',
            dispositivos: false, isolamento: false, evitarTecnicoId: null, setorOrigem: setorSelecionado.value
        }));
    }
    etapa.value = 2;
    window.scrollTo(0,0);
};

const toggleLeito = (item) => {
    item.ocupado = !item.ocupado;
    if(!item.ocupado) {
        item.nome = ''; item.mobilidade = 'deambula'; item.dispositivos = false; item.isolamento = false; item.evitarTecnicoId = null;
    }
};

const calcular = () => {
    const pacientesAtivos = listaLeitos.value.filter(l => l.ocupado && l.nome.trim() !== '');
    if (pacientesAtivos.length === 0) return alert("Adicione pelo menos um paciente com nome.");
    const tecnicosCopy = JSON.parse(JSON.stringify(listaTecnicos.value));
    resultadoDistribuicao.value = calcularDistribuicao(pacientesAtivos, tecnicosCopy);
    etapa.value = 3;
    window.scrollTo(0,0);
};

const reiniciar = () => {
    if(confirm("Iniciar novo plantão?")) {
        etapa.value = 1; resultadoDistribuicao.value = []; setorSelecionado.value = '';
    }
};

const totalPacientes = computed(() => listaLeitos.value.filter(l => l.ocupado).length);
</script>

<template>
  <div class="flex h-screen bg-[#FDFBFD] font-sans text-gray-600 overflow-hidden">
    
    <aside class="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col shadow-sm z-20">
        <div class="p-6 border-b border-gray-50 flex items-center gap-3">
            <div class="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                <i class="fa-solid fa-hospital-user text-lg"></i>
            </div>
            <div>
                <h1 class="font-bold text-gray-800 leading-tight">S.D.P.</h1>
                <p class="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Hospitalar</p>
            </div>
        </div>

        <nav class="flex-1 p-4 space-y-2">
            <div class="nav-item" :class="{ 'active': etapa === 1 }">
                <i class="fa-solid fa-sliders w-6"></i> Configuração
            </div>
            <div class="nav-item" :class="{ 'active': etapa === 2 }">
                <i class="fa-solid fa-bed-pulse w-6"></i> Triagem
            </div>
            <div class="nav-item" :class="{ 'active': etapa === 3 }">
                <i class="fa-solid fa-clipboard-list w-6"></i> Relatório
            </div>
        </nav>

        <div class="p-6 border-t border-gray-50">
            <div class="bg-primary-light p-4 rounded-xl text-center">
                <p class="text-xs text-primary font-bold mb-1">Setor Atual</p>
                <p class="text-xl font-bold text-gray-800">{{ setorSelecionado || '--' }}</p>
            </div>
        </div>
    </aside>

    <div class="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header class="md:hidden bg-white border-b border-gray-100 p-4 flex justify-between items-center z-30 sticky top-0">
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-primary text-white rounded-md flex items-center justify-center">
                    <i class="fa-solid fa-hospital-user text-sm"></i>
                </div>
                <span class="font-bold text-gray-700">S.D.P.</span>
            </div>
            <span v-if="setorSelecionado" class="text-xs font-bold bg-primary-light text-primary px-3 py-1 rounded-full">
                {{ setorSelecionado }}
            </span>
        </header>

        <main class="flex-1 overflow-y-auto p-4 md:p-10 pb-24 md:pb-10 scroll-smooth">
            <div class="max-w-5xl mx-auto min-h-full flex flex-col">
                
                <div class="mb-8">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <span v-if="etapa === 1">Configuração do Plantão</span>
                        <span v-if="etapa === 2">Mapa de Leitos e Pacientes</span>
                        <span v-if="etapa === 3">Distribuição Final</span>
                    </h2>
                    <p class="text-gray-400 text-sm mt-1">Gerencie a equipe e otimize a carga de trabalho.</p>
                </div>

                <transition name="fade" mode="out-in">
                <div v-if="etapa === 1" class="grid lg:grid-cols-2 gap-8">
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                        <div class="mb-6">
                            <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Selecione o Setor</label>
                            <div class="relative">
                                <select v-model="setorSelecionado" class="w-full p-4 bg-gray-50 border-none rounded-xl text-gray-700 font-bold focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer hover:bg-gray-100 transition">
                                    <option value="" disabled>Escolha na lista...</option>
                                    <option v-for="s in Object.keys(SETORES)" :key="s" :value="s">{{ s }}</option>
                                </select>
                                <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase mb-2">Técnicos no Plantão</label>
                            <div class="flex items-center justify-between bg-gray-50 p-2 rounded-xl">
                                <button @click="qtdTecnicos > 1 ? qtdTecnicos-- : null; gerarTecnicos()" 
                                    class="w-12 h-12 bg-white rounded-lg text-gray-400 hover:text-primary shadow-sm hover:shadow transition text-xl font-bold">-</button>
                                <span class="text-2xl font-bold text-primary">{{ qtdTecnicos }}</span>
                                <button @click="qtdTecnicos < 8 ? qtdTecnicos++ : null; gerarTecnicos()" 
                                    class="w-12 h-12 bg-primary text-white rounded-lg shadow-lg shadow-primary/30 hover:bg-primary-hover transition text-xl font-bold">+</button>
                            </div>
                        </div>
                    </div>

                    <div v-if="listaTecnicos.length > 0" class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">Equipe de Enfermagem</h3>
                        <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scroll">
                            <div v-for="tec in listaTecnicos" :key="tec.id" class="flex items-center gap-3 group">
                                <div class="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-sm">
                                    {{ tec.id }}
                                </div>
                                <input type="text" v-model="tec.nome" class="flex-1 bg-transparent border-b border-gray-100 focus:border-primary outline-none py-2 text-gray-700 placeholder-gray-300 transition" placeholder="Nome do Técnico">
                                <label class="cursor-pointer relative group/tooltip">
                                    <input type="checkbox" v-model="tec.restricao" class="hidden peer">
                                    <div class="w-8 h-8 rounded-lg border border-gray-200 text-gray-300 flex items-center justify-center transition peer-checked:bg-red-50 peer-checked:border-red-200 peer-checked:text-red-500 hover:bg-gray-50">
                                        <i class="fa-solid fa-ban"></i>
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
                        <div v-for="item in listaLeitos" :key="item.leito" 
                            class="bg-white rounded-xl border transition-all duration-300 relative group overflow-hidden"
                            :class="item.ocupado ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary' : 'border-gray-100 hover:border-primary/30 hover:shadow-md'"
                        >
                            <div @click="toggleLeito(item)" class="p-4 cursor-pointer flex justify-between items-center select-none"
                                :class="item.ocupado ? 'bg-primary text-white' : 'bg-white text-gray-500'">
                                <span class="font-bold text-lg">{{ item.leito }}</span>
                                <div v-if="!item.ocupado" class="w-6 h-6 rounded-full border border-gray-200 group-hover:border-primary/50 group-hover:text-primary flex items-center justify-center text-xs">
                                    <i class="fa-solid fa-plus"></i>
                                </div>
                                <div v-else class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <i class="fa-solid fa-check text-xs"></i>
                                </div>
                            </div>

                            <div v-if="item.ocupado" class="p-4 space-y-4 animate-fade-in">
                                <input type="text" v-model="item.nome" class="w-full text-sm font-medium border-b border-gray-200 focus:border-primary outline-none py-1 placeholder-gray-300" placeholder="Nome do Paciente">
                                <div class="flex gap-2">
                                    <label class="flex-1 cursor-pointer">
                                        <input type="radio" value="deambula" v-model="item.mobilidade" class="hidden peer">
                                        <div class="h-16 rounded-lg border border-gray-100 bg-gray-50 flex flex-col items-center justify-center text-gray-400 peer-checked:bg-green-50 peer-checked:border-green-400 peer-checked:text-green-600 transition hover:bg-white hover:shadow-sm">
                                            <i class="fa-solid fa-person-walking text-lg mb-1"></i>
                                            <span class="text-[9px] font-bold uppercase">Leve</span>
                                        </div>
                                    </label>
                                    <label class="flex-1 cursor-pointer">
                                        <input type="radio" value="semi" v-model="item.mobilidade" class="hidden peer">
                                        <div class="h-16 rounded-lg border border-gray-100 bg-gray-50 flex flex-col items-center justify-center text-gray-400 peer-checked:bg-yellow-50 peer-checked:border-yellow-400 peer-checked:text-yellow-600 transition hover:bg-white hover:shadow-sm">
                                            <i class="fa-solid fa-wheelchair text-lg mb-1"></i>
                                            <span class="text-[9px] font-bold uppercase">Médio</span>
                                        </div>
                                    </label>
                                    <label class="flex-1 cursor-pointer">
                                        <input type="radio" value="acamado" v-model="item.mobilidade" class="hidden peer">
                                        <div class="h-16 rounded-lg border border-gray-100 bg-gray-50 flex flex-col items-center justify-center text-gray-400 peer-checked:bg-red-50 peer-checked:border-red-400 peer-checked:text-red-600 transition hover:bg-white hover:shadow-sm">
                                            <i class="fa-solid fa-bed-pulse text-lg mb-1"></i>
                                            <span class="text-[9px] font-bold uppercase">Pesado</span>
                                        </div>
                                    </label>
                                </div>
                                <div class="space-y-2 pt-2 border-t border-gray-50">
                                    <label class="flex items-center gap-2 cursor-pointer group/chk">
                                        <div class="relative flex items-center">
                                            <input type="checkbox" v-model="item.dispositivos" class="peer h-4 w-4 appearance-none rounded border border-gray-300 checked:bg-purple-500 checked:border-purple-500 transition">
                                            <i class="fa-solid fa-check text-white text-[10px] absolute left-[3px] opacity-0 peer-checked:opacity-100 pointer-events-none"></i>
                                        </div>
                                        <span class="text-xs text-gray-600 group-hover/chk:text-purple-600 transition">Usa SNE / GTM</span>
                                    </label>
                                    <label class="flex items-center gap-2 cursor-pointer group/chk">
                                        <div class="relative flex items-center">
                                            <input type="checkbox" v-model="item.isolamento" class="peer h-4 w-4 appearance-none rounded border border-gray-300 checked:bg-red-500 checked:border-red-500 transition">
                                            <i class="fa-solid fa-check text-white text-[10px] absolute left-[3px] opacity-0 peer-checked:opacity-100 pointer-events-none"></i>
                                        </div>
                                        <span class="text-xs font-bold text-gray-600 group-hover/chk:text-red-600 transition flex items-center gap-1">
                                            <i class="fa-solid fa-triangle-exclamation text-[10px]"></i> Isolamento
                                        </span>
                                    </label>
                                </div>
                                <select v-model="item.evitarTecnicoId" class="w-full text-[10px] p-2 bg-gray-50 rounded text-gray-500 border-none outline-none">
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
                    <div class="grid md:grid-cols-2 gap-6">
                        <div v-for="tec in resultadoDistribuicao" :key="tec.id" 
                            class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                            <div class="p-5 border-b border-gray-50 flex justify-between items-start bg-gradient-to-br from-white to-gray-50">
                                <div class="flex gap-4">
                                    <div class="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20">
                                        {{ tec.id }}
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-lg text-gray-800">{{ tec.nome }}</h3>
                                        <div class="flex gap-2 mt-1">
                                            <span class="text-[10px] font-bold bg-primary-light text-primary px-2 py-1 rounded">Carga: {{ tec.carga }}</span>
                                            <span v-if="tec.restricao" class="text-[10px] font-bold bg-red-50 text-red-500 px-2 py-1 rounded border border-red-100">Restrição</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="text-center">
                                    <span class="block text-2xl font-bold text-gray-300">{{ tec.pacientes.length }}</span>
                                </div>
                            </div>
                            <div class="p-4 flex-1 bg-white space-y-2">
                                <div v-for="p in tec.pacientes" :key="p.leito" 
                                    class="p-3 rounded-xl border flex items-center justify-between group hover:shadow-md transition"
                                    :class="p.isolamento ? 'border-l-4 border-l-red-500 bg-red-50/10 border-gray-100' : 'border-l-4 border-l-primary bg-white border-gray-100'">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <span class="bg-gray-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{{ p.leito }}</span>
                                            <span class="font-bold text-gray-700 text-sm">{{ p.nome }}</span>
                                        </div>
                                        <div class="flex gap-1 mt-1">
                                             <span class="px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wide"
                                                :class="{
                                                    'bg-green-50 text-green-700 border-green-100': p.mobilidade === 'deambula',
                                                    'bg-yellow-50 text-yellow-700 border-yellow-100': p.mobilidade === 'semi',
                                                    'bg-red-50 text-red-700 border-red-100': p.mobilidade === 'acamado'
                                                }">{{ p.mobilidade }}</span>
                                            <span v-if="p.dispositivos" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-100">SNE</span>
                                            <span v-if="p.isolamento" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-600 border border-red-100 animate-pulse">ISO</span>
                                        </div>
                                    </div>
                                    <div class="text-lg font-bold text-gray-200 group-hover:text-primary-light transition">{{ p.peso }}</div>
                                </div>
                                <div v-if="tec.pacientes.length === 0" class="h-24 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-100 rounded-xl">
                                    <i class="fa-solid fa-mug-hot mb-1"></i>
                                    <span class="text-xs">Livre</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </transition>

                <div class="flex-grow"></div>

                <footer class="mt-20 pt-10 border-t border-gray-100 text-center pb-10 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                    
                    <p class="text-gray-600 mb-6 font-medium text-lg tracking-tight">
                        Siga Jeovan Bispo nas redes sociais:
                    </p>
                    
                    <div class="flex justify-center items-center gap-6 mb-8">
                        <a href="https://instagram.com/Jeo_Dev" target="_blank" class="transform hover:-translate-y-1 transition duration-300 group">
                            <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:shadow-pink-500/40">
                                <i class="fa-brands fa-instagram text-3xl"></i>
                            </div>
                            <span class="block text-[10px] mt-2 font-bold text-gray-400 group-hover:text-pink-500 transition">@Jeo_Dev</span>
                        </a>
                        
                        <a href="https://wa.me/5571987790138" target="_blank" class="transform hover:-translate-y-1 transition duration-300 group">
                            <div class="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40">
                                <i class="fa-brands fa-whatsapp text-3xl"></i>
                            </div>
                            <span class="block text-[10px] mt-2 font-bold text-gray-400 group-hover:text-green-500 transition">WhatsApp</span>
                        </a>
                    </div>

                    <div class="text-sm text-gray-400 font-medium">
                        Jeovan Bispo &copy; 2026. All Rights Reserved
                    </div>
                    <div class="text-xs text-primary mt-1 font-bold opacity-60 uppercase tracking-widest">
                        Sistema de Distribuição
                    </div>
                </footer>

            </div>
        </main>

        <div class="bg-white border-t border-gray-100 p-4 md:px-10 sticky bottom-0 z-40 flex items-center justify-between shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
            <div class="hidden md:block text-xs text-gray-400 font-bold uppercase tracking-wide">
                Sistema de Distribuição
            </div>
            
            <div class="flex gap-4 w-full md:w-auto">
                <button v-if="etapa > 1" @click="etapa--" 
                    class="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 hover:text-primary transition">
                    Voltar
                </button>

                <button v-if="etapa === 1" @click="avanarParaPacientes" 
                    class="flex-1 md:flex-none px-8 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-primary-hover hover:shadow-primary/50 transition transform active:scale-95 flex items-center justify-center gap-2">
                    Iniciar Triagem <i class="fa-solid fa-arrow-right"></i>
                </button>

                <button v-if="etapa === 2" @click="calcular" 
                    class="flex-1 md:flex-none px-8 py-3 rounded-xl bg-green-500 text-white font-bold shadow-lg shadow-green-500/30 hover:bg-green-600 transition transform active:scale-95 flex items-center justify-center gap-2">
                    Distribuir Pacientes <i class="fa-solid fa-check"></i>
                </button>

                 <button v-if="etapa === 3" @click="reiniciar" 
                    class="flex-1 md:flex-none px-8 py-3 rounded-xl bg-gray-800 text-white font-bold shadow-lg hover:bg-gray-900 transition transform active:scale-95">
                    Novo Plantão
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.nav-item {
    @apply flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 cursor-pointer transition hover:bg-gray-50 hover:text-primary;
}
.nav-item.active {
    @apply bg-primary-light text-primary font-bold;
}

.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-track { background: transparent; }
.custom-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
</style>