# Segurança

Este sistema guarda estoque, custos, responsáveis e dados operacionais de uma loja. A instalação de produção é privada e usa um gateway de identidade confiável.

## Controles

- Identidade e papel verificados no servidor a cada leitura ou alteração.
- Permissões de gerente para cadastros, compras, inventário, equipe e recuperação.
- Origem verificada nas mutações; requisições sem origem válida são recusadas.
- Validação Zod de entradas, quantidades, datas, receitas e backups.
- SQL parametrizado e transação de saldo, auditoria e idempotência.
- Histórico separado e estorno por novo movimento; sem exclusão de vendas.
- Mensagens de erro sem expor SQL ou credenciais ao usuário.
- Neutralização de células de fórmula na exportação CSV.

## Fronteira de confiança

Os cabeçalhos `oai-authenticated-user-*` só são confiáveis quando vêm do gateway do Sites. A simulação de identidade é exclusiva do desenvolvimento em loopback. Hospedar o Worker diretamente aceitando esses cabeçalhos do cliente comprometeria o controle de acesso.

Não use a demonstração como ambiente de teste dos saldos reais. Não publique backups, arquivos de identidade, logs privados ou a pasta `.wrangler`.

## Relatar problemas

Ao relatar um problema no repositório, descreva o comportamento e passos com dados fictícios. Não inclua contatos dos funcionários, saldos da loja, credenciais ou dumps. Para uma falha que envolva acesso a dados reais, interrompa os acessos afetados e comunique o proprietário por um canal privado.

Os controles foram testados em ambiente local; isso não equivale a uma auditoria de segurança independente.

## Dependências

A verificação de 6 de outubro de 2026 não apontou vulnerabilidades no conjunto de dependências de produção (`npm audit --omit=dev`). Foram aplicados patches de Next.js e dependências transitivas, além dos componentes React do servidor e do leitor de dimensões de imagem.

O conjunto completo de ferramentas de desenvolvimento ainda possui avisos relacionados a globbing, servidor de desenvolvimento e ferramentas Cloudflare. Alguns dependem de atualizações incompatíveis ou de correções dos mantenedores. Não use `npm audit fix --force` indiscriminadamente; teste qualquer atualização. Desenvolva em loopback, com código e ativos confiáveis, sem expor o servidor de desenvolvimento na rede. Revise os avisos em cada atualização.
