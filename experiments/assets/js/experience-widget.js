import Chart from 'chart.js/auto';
import _ from 'lodash';

/**
 * @param {string} from
 * @param {string} to
 * @return rough number of months between `from` and `to` inclusive
 */
function periodLengthMonths(from, to) {
  return Math.ceil((new Date(to) - new Date(from)) / 1000 / 60 / 60 / 24 / ((365 * 4 + 1) / 4) * 12) + 1
}

const experienceTimeline = [
  {
    from: '2013.06',
    to: '2013.08',
    tech: ['JS', 'PhoneGap', 'Mobile'],
  },
  {
    from: '2015.04',
    to: '2015.05',
    tech: ['Java', 'JSF', 'Hibernate', 'MySQL', 'Tomcat', 'liquibase'],
  },
  {
    from: '2015.06',
    to: '2016.04',
    tech: ['Scala', 'Play Framework', 'Postgres', 'Slick', 'MongoDB', 'ReactiveMongo', 'Hibernate', 'Redis', 'Akka', 'RabbitMQ', 'Elasticsearch', 'Jenkins', 'Bash'],
  },
  {
    from: '2016.05',
    to: '2016.06',
    tech: ['Java', 'AWS'],
  },
  {
    from: '2016.07',
    to: '2016.08',
    tech: ['Java', 'Netty', 'Undertow', 'AWS', 'JS', 'jQuery', 'Python', 'Bash'],
  },
  {
    from: '2016.07',
    to: '2017.04',
    tech: ['JS', 'Node.js', 'WebSockets', 'WebRTC', 'Redis', 'Druid'],
  },
  {
    from: '2017.02',
    to: '2017.08',
    tech: ['Java', 'FFmpeg', 'JavaCPP', 'RxJava', 'ZeroMQ', 'Netty', 'Tomcat', 'Spring', 'WebSockets', 'MediaSource API', 'Docker', 'VirtualBox', 'Bash'],
  },
  {
    from: '2017.05',
    to: '2019.06',
    tech: ['Scala', 'Akka HTTP', 'Spray HTTP', 'kryo', 'protobuf', 'Scala macros', 'scalameta', 'Reactive Streams', 'Monix', 'Akka', 'Hazelcast', 'Kafka', 'Oracle DB', 'JDBC', 'MongoDB', 'Couchbase', 'MacWire', 'scalaxb/soap', 'gRPC', 'circe', 'json4s', 'spray', 'finagle http', 'gatling'],
  },
  {
    from: '2019.01',
    to: '2019.02',
    tech: ['AWS'],
  },
  {
    from: '2019.07',
    to: '2020.04',
    tech: ['Scala', 'Java', 'Postgres', 'Lift Web', 'flexbox', 'bootstrap', 'JS', 'jQuery', 'circe', 'json4s', 'Google Ads', 'Microsoft Bing Ads'],
  },
  {
    from: '2020.05',
    to: '2022.04',
    tech: ['Scala', 'Java', 'MongoDB', 'Finagle', 'Akka', 'cats', 'cats-effect', 'Kubernetes', 'Helm', 'ArgoCD', 'Jenkins', 'Kibana', 'Elasticsearch', 'Prometheus', 'Grafana'],
  },
  {
    from: '2022.05',
    to: '2023.02',
    tech: ['Scala', 'Ruby', 'Python', 'JS', 'Elasticsearch', 'Lucene', 'Kibana', 'Redis', 'Apache Spark', 'Apache Beam', 'AWS', 'CircleCI', 'Terraform', 'Datadog', 'Okta OAuth'],
  },
  {
    from: '2023.03',
    to: '2023.05',
    tech: ['Python', 'Bash', 'CircleCI', 'Salesforce Commerce Cloud', 'AWS', 'Slack API'],
  },
  {
    from: '2023.05',
    to: '2023.05',
    tech: ['Scala'],
  },
]

const languages = ['Java', 'JS', 'Python', 'Bash', 'Scala', 'Ruby']

// const languageTimeline = experienceTimeline.map(e => {
//   const res = JSON.parse(JSON.stringify(e))
//   res.tech = e.tech.filter(t => languages.includes(t))
//   return res
// })

const techGroups = {
  Scala: ['Play Framework', 'Finagle', 'Akka', 'Cats', 'circe', 'MacWire', 'Monix', 'macros', 'scalameta', 'kryo', 'gatling', 'ReactiveMongo', 'doobie', 'Slick', 'Hazelcast', 'Lift Web', 'json4s', 'spray', 'scalaxb/soap'],
  Java: ['Spring', 'Netty', 'Undertow', 'Tomcat', 'RxJava', 'JDBC', 'Hibernate', 'liquibase', 'JSF', 'Websockets', 'JavaCPP'],
  JS: ['Node.js', 'Socket.io', 'WebRTC', 'MediaSource API', 'Three.js', 'jQuery', 'bootstrap', 'flexbox'],
  Python: ['NumPy', 'Matplotlib', 'lxml'],
  Ruby: ['Administrate', 'OAuth', 'Okta'],
  Bash: ['bash', 'zsh'],
  DB: ['Postgres', 'MySQL', 'Oracle', 'MongoDB', 'Elasticsearch', 'Lucene', 'Kibana', 'Redis', 'Druid', 'Couchbase'],
  CI: ['CircleCI', 'Terraform', 'Jenkins', 'Kubernetes', 'Helm', 'ArgoCD', 'Docker'],
  AWS: ['EC2', 'Lambda', 'ECS', 'S3', 'SQS', 'KMS', 'VPC', 'IAM'],
  Protocols: ['TCP/IP', 'UDP', 'DNS', 'gRPC', 'protobuf'],
  'Data processing': ['Kafka', 'Apache Spark', 'Apache Beam', 'RabbitMQ', 'ZeroMQ'],
  Monitoring: ['Prometheus', 'Grafana', 'Datadog'],
  Extras: ['FFmpeg', 'Android', 'Reverse engineering'],
}

const techExperience = Object.entries(
  _.groupBy(
    experienceTimeline
      .flatMap(x =>
        x.tech.map(tech => (
          {
            experienceLengthMonths: periodLengthMonths(x.from, x.to),
            tech: tech,
          }
        ))
      ),
    x => x.tech
  )
)
  .map(kv =>
    kv[1].reduce((a, x) => ({
      experienceLengthMonths: a.experienceLengthMonths + x.experienceLengthMonths,
      tech: kv[0],
    }))
  )
  .sort((a, b) => a.experienceLengthMonths - b.experienceLengthMonths)
  .sort((a, b) => (+languages.includes(a.tech)) - (+languages.includes(b.tech)))
  .reverse()

const chart = false
if (chart) {
  new Chart(
    document.querySelector('#technologies-chart'),
    {
      type: 'doughnut',
      data: {
        labels: techExperience.map(x => x.tech),
        datasets: [
          {
            label: 'Technology',
            data: techExperience.map(x => x.experienceLengthMonths / 12),
          },
        ],
      },
    },
  )
}

const logTechGroupsStr = false
const techGroupsStr = Object.entries(techGroups).map(kv =>
  `${kv[0]}: ` + kv[1].join(', ')
).join('\n')
if (logTechGroupsStr) {
  console.log(techGroupsStr)
}
