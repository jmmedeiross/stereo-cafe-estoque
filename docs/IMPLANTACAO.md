# Implantação e aceitação

## Ambiente suportado

A publicação atual usa Sites, Cloudflare Workers e D1. A autenticação é realizada pelo gateway privado do Sites, que injeta identidade confiável. O Worker só deve receber tráfego por esse gateway.

Configuração de produção:

- `DB`: binding do D1 criado pela plataforma.
- `ADMIN_EMAILS`: lista de e-mails dos administradores iniciais, separada por vírgulas, configurada no ambiente da hospedagem.
- `.openai/hosting.json`: bindings lógicos e identidade do Site, gerenciados no fluxo de publicação. No GitHub, a identidade do Site foi removida.
- Migrações: arquivos `drizzle/*.sql`, aplicados em ordem pela publicação.

Não coloque ADMIN_EMAILS, credenciais, bancos ou dados reais no repositório público. O exemplo `.dev.vars.example` serve apenas à simulação local.

## Funcionários

1. Cadastre o e-mail e perfil no sistema, com uma conta individual.
2. Autorize esse mesmo e-mail no acesso privado do Site.
3. O funcionário entra com sua conta pessoal e recebe o papel cadastrado.
4. Teste um atendente: ele deve vender e preparar, mas receber `403` ao tentar alterar uma receita por API.

O cadastro interno não envia convites nem modifica a política externa de acesso. Os e-mails da equipe precisam ser fornecidos pelo proprietário para concluir a liberação.

## Atualizar sem perder registros

Antes de publicar, exporte os dados e rode testes, verificação de tipos e build. Use a mesma identidade do Site e o mesmo binding DB. Migrações aplicadas são imutáveis; mudanças futuras geram novas migrações.

Os movimentos anteriores em JSON são copiados com `INSERT OR IGNORE` para a tabela de auditoria. O produto retirado do cardápio não reaparece e os identificadores dos demais produtos são preservados.

Não inicie o banco com dados reais no GitHub Actions. O ambiente de CI só usa código, modelos e banco local de teste.

## Recuperação

Snapshots diários da aplicação permitem recuperar saldos e cadastros mantendo a auditoria. Eles não sobrevivem à perda do próprio banco.

Mantenha uma exportação completa externa de D1 e registre o responsável, local e periodicidade. Uma exportação D1 exige acesso administrativo da hospedagem; use o fluxo oficial da plataforma ou `wrangler d1 export` em uma instalação Cloudflare administrada por você. Nunca commit essas exportações.

O D1 também oferece mecanismos de recuperação por tempo conforme o plano e a configuração da conta. A retenção deve ser confirmada no ambiente real, sem pressupor uma duração fixa.

## Checklist de aceite da loja

- [ ] Conta do proprietário e ao menos um atendente verificadas.
- [ ] Saldos, lotes e custos conferidos fisicamente.
- [ ] Receitas e preços confirmados pela cafeteria.
- [ ] Limite de uso do coado aprovado pelo responsável pela operação.
- [ ] Vendas, perdas, recebimento, contagem e estorno ensaiados.
- [ ] Exportação e restauração ensaiadas em base de teste.
- [ ] Responsável por backups e recuperação definido.
- [ ] Internet, computador/celular e rotina de contingência acordados.
- [ ] Aceite do responsável da loja registrado.

A versão é utilizável para cadastro e testes operacionais. O aceite de uso real depende dessas verificações e dos dados fornecidos pela loja.

## Limites conhecidos

Uma loja, lançamentos manuais, entregas integrais de pedido e ausência de emissão fiscal. O funcionamento depende de conexão. A interface detecta falha de conexão e preserva formulários durante erros de envio, mas não implementa uma fila offline. Não há benchmark de carga ou SLA contratado.

Referências técnicas: [D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch), [exportações D1](https://developers.cloudflare.com/d1/best-practices/import-export-data/) e [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).
