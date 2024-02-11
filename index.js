const loginForm = document.getElementById('login')
const username = document.getElementById('username')
const password = document.getElementById('password')
const errorDiv = document.getElementById('errors')
const profileView = document.getElementById('profileView')
const logoutBtn = document.getElementById('logoutBtn')

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  try {
    const res = await fetch('https://01.kood.tech/api/auth/signin', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(
          `${username.value}:${password.value}`
        )}`,
      },
    })

    if (res.ok) {
      const token = await res.json()
      localStorage.setItem('jwt_token', token)
      displayProfile()
    } else {
      const err = await res.json()
      displayErr(err.error)
    }
  } catch (err) {
    console.error('Login error: ', err)
    displayErr('Serverside error')
  }
})

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('jwt_token')
  displayLogin()
})

const displayErr = (err) => {
  errorDiv.textContent = err
  errorDiv.style.display = 'block'
}

const displayProfile = () => {
  loginForm.style.display = 'none'
  errorDiv.style.display = 'none'
  profileView.style.display = 'block'
  username.value = ''
  password.value = ''
  request()
}

const displayLogin = () => {
  loginForm.style.display = 'block'
  profileView.style.display = 'none'
  errorDiv.style.display = 'none'
}

function getRandColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

const request = async () => {
  const query = `
    query {
      user {
        id
        login
        attrs
        totalUp
        totalDown
        createdAt
        updatedAt
        transactions(order_by: { createdAt: asc }) {
            id
            userId
            type
            amount
            createdAt
            path
        }
      }
    }`

  const endpoint = 'https://01.kood.tech/api/graphql-engine/v1/graphql'

  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('jwt_token')}`,
    },
    body: JSON.stringify({ query }),
  }).then(res => res.json())
    .then(result => {
      const { email, firstName, lastName, tel, addressCity, country } = result.data.user[0].attrs
      const { totalDown, totalUp } = result.data.user[0]
      const transactions = result.data.user[0].transactions

      let totalXp = 0
      let pieData = [{ label: '', value: 0 }]
      let lineData = [{ month: '', value: 0 }]

      for (let i = 0; i < transactions.length; i++) {
        const { type, amount, path, createdAt } = transactions[i]
        if (type === 'xp' && !/piscine-js/.test(path) && !/piscine-go/.test(path)) {
          const date = new Date(createdAt)
          const month = date.toLocaleDateString('default', { month: 'long' })

          totalXp += amount
          pieData.push({ label: path, value: amount/1000 })
          lineData.push({ month: month, value: totalXp/1000 })
        }
      }

      const totalRatio = totalUp/totalDown
      const auditDone = totalUp/1000
      const auditReceived = totalDown/1000

      document.getElementById('name').textContent = firstName + ' ' + lastName
      document.getElementById('email').textContent = email

      document.getElementById('xp').textContent = (totalXp/1000).toFixed(0) + 'kB'

      document.getElementById('doneAudits').textContent = auditDone.toFixed(0) + 'kB'
      document.getElementById('receivedAudits').textContent = auditReceived.toFixed(0) + 'kB'
      document.getElementById('totalRatio').textContent = totalRatio.toFixed(1)

      let total = pieData.reduce((sum, item) => {
        return sum + item.value
      }, 0)

      const pieChart = document.getElementById('pieChart')
      const rad = Math.min(pieChart.clientWidth, pieChart.clientHeight) / 2
      const cx = pieChart.clientWidth / 2
      const cy = pieChart.clientHeight / 2
      let start = 0
      const tooltip = document.getElementById('pieTooltip')

      pieData.forEach(item => {
        const slice = (item.value / total) * 360
        const end = start + slice
        const x1 = cx + rad * Math.cos((start * Math.PI) / 180)
        const y1 = cy + rad * Math.sin((start * Math.PI) / 180)
        const x2 = cx + rad * Math.cos((end * Math.PI) / 180)
        const y2 = cy + rad * Math.sin((end * Math.PI) / 180)
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')

        path.setAttribute('d', `M ${cx},${cy} L ${x1},${y1} A ${rad},${rad} 0 ${slice > 180 ? 1 : 0},
        1 ${x2},${y2} Z`)
        path.setAttribute('fill', getRandColor())
        path.addEventListener('mouseover',  (e) => {
          const mouseX = e.clientX
          const mouseY = e.clientY
          tooltip.style.display = 'block'
          tooltip.style.left = mouseX + 'px'
          tooltip.style.top = mouseY + 'px'
          tooltip.innerHTML = `${item.label}: ${item.value}`
        })
        path.addEventListener('mouseout', () => tooltip.style.display = 'none')

        pieChart.appendChild(path)
        start = end
      })

      const width = 400
      const height = 200
      const margin = { top: 20, right: 20, bottom: 30, left: 50 }

      var lineChart = d3.select('#lineChart')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

      const xScale = d3.scaleBand().range([0, width]).padding(0.1)
      const yScale = d3.scaleLinear().range([height, 0])
      const line = d3
        .line()
        .x((d) => { return xScale(d.month) })
        .y((d) => { return yScale(d.value) })

      xScale.domain(
        lineData.map((d) => {
        return d.month
        })
      )

      yScale.domain([
        0,
        d3.max(lineData, (d) => {
          return d.value;
        }),
      ])

      lineChart
        .append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(d3.axisBottom(xScale))

      lineChart.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale))

      lineChart
        .append('path')
        .datum(lineData)
        .attr('class', 'line')
        .attr('d', line)
    }).catch(err => console.error('Error: ', err))
}