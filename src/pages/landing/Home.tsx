import React from 'react'
import { Layout, Typography, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/landing/Header'
import Footer from '../../components/landing/Footer'
import './landing.css'

const { Content } = Layout
const { Title, Paragraph } = Typography

const Home: React.FC = () => {
  const navigate = useNavigate()

  return (
    <Layout className="landing-layout">
      <Header />
      <Content className="landing-content">
        <div className="landing-container-center">
          <div className="landing-section">
            <Title level={1} className="landing-title-large">
              О продукте
            </Title>
            <Paragraph className="landing-paragraph">
              Здесь будет описание продукта. Заполним позднее.
            </Paragraph>
          </div>

          <Button
            type="primary"
            size="large"
            onClick={() => navigate('/tariffs')}
          >
            Посмотреть тарифы
          </Button>
        </div>
      </Content>
      <Footer />
    </Layout>
  )
}

export default Home
