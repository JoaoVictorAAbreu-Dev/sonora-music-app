# Roadmap

Six one-week sprints (~10 h each, tasks of 1–3 h) after M1/M2, tracked as GitHub issues with one milestone per sprint.
Items blocked on the project owner live in **Backlog** with the `blocked:owner` label.

Board: https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/milestones

## Sprint 1 — M3a API do catálogo

- [ ] [#1](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/1) Schemas de catálogo em packages/shared
- [ ] [#2](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/2) Cliente Jamendo na API
- [ ] [#3](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/3) Cache read-through em track_cache
- [ ] [#4](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/4) Rotas de catálogo: /v1/search, /tracks/:id, /albums/:id, /artists/:id, /home
- [ ] [#5](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/5) Testes de catálogo com Jamendo mockado
- [ ] [#6](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/6) Docs e compose para o catálogo

## Sprint 2 — M3b Início e Busca

- [ ] [#7](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/7) TanStack Query e hooks de catálogo no app
- [ ] [#8](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/8) Componentes: Card de álbum, Linha de faixa, Chip de filtro, Esqueleto
- [ ] [#9](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/9) Tela Início (T05)
- [ ] [#10](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/10) Tela Buscar (T06) com todos os estados
- [ ] [#11](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/11) Testes Jest de Início e Busca

## Sprint 3 — M4a Player base

- [ ] [#12](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/12) Instalar react-native-track-player e serviço de playback
- [ ] [#13](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/13) Store do player (fila, próxima/anterior, shuffle, repeat)
- [ ] [#14](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/14) Mini player (T11) com vidro e fallback sólido
- [ ] [#15](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/15) Player expandido (T12)
- [ ] [#16](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/16) Testes do store do player

## Sprint 4 — M4b Fila, background e histórico

- [ ] [#17](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/17) Áudio em segundo plano e controles na tela de bloqueio
- [ ] [#18](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/18) Fila (T13): abrir/fechar, reordenar, remover
- [ ] [#19](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/19) Animação de troca de capa
- [ ] [#20](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/20) Histórico: POST/GET /v1/history e registro no app
- [ ] [#21](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/21) Testes e checklist de aparelho do player

## Sprint 5 — M5 Biblioteca

- [ ] [#22](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/22) API de favoritos (GET/PUT/DELETE)
- [ ] [#23](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/23) API de playlists: CRUD e faixas (add/remove/reorder)
- [ ] [#24](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/24) Biblioteca (T07) e Favoritos (T14) com coração animado
- [ ] [#25](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/25) Criar/editar playlist (T16), adicionar à playlist (T15), detalhe (T10)
- [ ] [#26](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/26) Excluir playlist com confirmação (T20) e toast

## Sprint 6 — M7/M8 essenciais

- [ ] [#27](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/27) Excluir conta: DELETE /v1/me e Configurações (T18)
- [ ] [#28](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/28) Estado offline (T21) e estados globais de erro/vazio
- [ ] [#29](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/29) Passada de acessibilidade e motion
- [ ] [#30](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/30) Página de política de privacidade, revisão de logs e uptime em /health
- [ ] [#31](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/31) Workflow de deploy escrito (não disparado) e perfis EAS

## Backlog

- [ ] [#32](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/32) Login social Google e Apple (M6)
- [ ] [#33](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/33) Recuperar senha (T04)
- [ ] [#34](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/34) Telas Artista (T08), Álbum (T09), Perfil (T17) e Sobre e licenças (T19)
- [ ] [#35](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/35) Deploy real, bucket de backup e teste de restore no GCP
- [ ] [#36](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/36) Rodar fluxo Maestro e checklist no aparelho
- [ ] [#37](https://github.com/JoaoVictorAAbreu-Dev/sonora-music-app/issues/37) Adicionar docs 04/05 e verificar licença Jamendo
